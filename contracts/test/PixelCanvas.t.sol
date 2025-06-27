// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/PixelCanvas.sol";

contract PixelCanvasTest is Test {
    PixelCanvas public canvas;
    uint256 constant CANVAS_WIDTH = 32;
    uint256 constant CANVAS_HEIGHT = 32;
    
    function setUp() public {
        canvas = new PixelCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    function testWipeCanvas() public {
        // First, paint some pixels
        canvas.setTile(0, 0, 100, 150, 200);
        canvas.setTile(10, 10, 50, 75, 100);
        
        // Verify pixels are set
        (uint8 r1, uint8 g1, uint8 b1) = canvas.getTile(0, 0);
        assertEq(r1, 100);
        assertEq(g1, 150);
        assertEq(b1, 200);
        
        // Wipe the canvas
        canvas.wipeCanvas();
        
        // Verify all pixels are white
        (uint8 r2, uint8 g2, uint8 b2) = canvas.getTile(0, 0);
        assertEq(r2, 255);
        assertEq(g2, 255);
        assertEq(b2, 255);
        
        (uint8 r3, uint8 g3, uint8 b3) = canvas.getTile(10, 10);
        assertEq(r3, 255);
        assertEq(g3, 255);
        assertEq(b3, 255);
    }
    
    function testWipeCooldown() public {
        // First wipe should succeed
        canvas.wipeCanvas();
        
        // Second wipe should fail due to cooldown
        vm.expectRevert(WipeOnCooldown.selector);
        canvas.wipeCanvas();
        
        // Warp time forward by 59 minutes (not enough)
        vm.warp(block.timestamp + 59 minutes);
        vm.expectRevert(WipeOnCooldown.selector);
        canvas.wipeCanvas();
        
        // Warp time forward to exactly 1 hour
        vm.warp(block.timestamp + 1 minutes + 1);
        // Should succeed now
        canvas.wipeCanvas();
    }
    
    function testGetNextWipeTime() public {
        // Initially should return 0 (available)
        assertEq(canvas.getNextWipeTime(), 0);
        
        // After wiping, should return the next available time
        uint256 wipeTime = block.timestamp;
        canvas.wipeCanvas();
        
        assertEq(canvas.getNextWipeTime(), wipeTime + 1 hours);
        
        // After cooldown expires, should return 0
        vm.warp(block.timestamp + 1 hours + 1);
        assertEq(canvas.getNextWipeTime(), 0);
    }
    
    function testCanvasWipedEvent() public {
        // Check that event is emitted
        vm.expectEmit(true, true, true, true);
        emit PixelCanvas.canvasWiped(address(this), block.timestamp);
        
        canvas.wipeCanvas();
    }
}