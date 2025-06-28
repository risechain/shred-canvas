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
    
    function testWriteSection() public {
        // Create array of colors (packed as uint24)
        uint24[] memory colors = new uint24[](4);
        colors[0] = (255 << 16) | (0 << 8) | 0;    // Red
        colors[1] = (0 << 16) | (255 << 8) | 0;    // Green  
        colors[2] = (0 << 16) | (0 << 8) | 255;    // Blue
        colors[3] = (255 << 16) | (255 << 8) | 0;  // Yellow
        
        // Write section starting at position (5, 5)
        canvas.writeSection(5, 5, colors);
        
        // Verify pixels were written correctly
        (uint8 r1, uint8 g1, uint8 b1) = canvas.getTile(5, 5);
        assertEq(r1, 255); assertEq(g1, 0); assertEq(b1, 0); // Red
        
        (uint8 r2, uint8 g2, uint8 b2) = canvas.getTile(6, 5);
        assertEq(r2, 0); assertEq(g2, 255); assertEq(b2, 0); // Green
        
        (uint8 r3, uint8 g3, uint8 b3) = canvas.getTile(7, 5);
        assertEq(r3, 0); assertEq(g3, 0); assertEq(b3, 255); // Blue
        
        (uint8 r4, uint8 g4, uint8 b4) = canvas.getTile(8, 5);
        assertEq(r4, 255); assertEq(g4, 255); assertEq(b4, 0); // Yellow
    }
    
    function testWriteSectionEvent() public {
        uint24[] memory colors = new uint24[](3);
        colors[0] = (100 << 16) | (150 << 8) | 200;
        colors[1] = (50 << 16) | (75 << 8) | 100;
        colors[2] = (200 << 16) | (100 << 8) | 50;
        
        // Check that event is emitted
        vm.expectEmit(true, true, true, true);
        emit PixelCanvas.sectionWritten(10, 15, 3);
        
        canvas.writeSection(10, 15, colors);
    }
    
    function testWriteSectionBounds() public {
        // Test writing near canvas edge
        uint24[] memory colors = new uint24[](10);
        for (uint i = 0; i < colors.length; i++) {
            colors[i] = uint24((i * 25) << 16) | uint24((i * 30) << 8) | uint24(i * 20);
        }
        
        // Write starting close to right edge - should handle bounds correctly
        canvas.writeSection(30, 31, colors); // Near bottom-right corner
        
        // Verify pixels within bounds were written
        (uint8 r1, uint8 g1, uint8 b1) = canvas.getTile(30, 31);
        assertEq(r1, 0); assertEq(g1, 0); assertEq(b1, 0);
        
        (uint8 r2, uint8 g2, uint8 b2) = canvas.getTile(31, 31);
        assertEq(r2, 25); assertEq(g2, 30); assertEq(b2, 20);
    }
}