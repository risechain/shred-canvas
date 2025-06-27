// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script, console} from "forge-std/Script.sol";
import {PixelCanvas} from "../src/PixelCanvas.sol";

/// @notice Script to deploy the PixelCanvas contract
contract DeployPixelCanvas is Script {
    /// @notice Deploy the PixelCanvas contract with configurable dimensions
    /// @param _width Width of the canvas
    /// @param _height Height of the canvas

    
    function run(uint256 _width, uint256 _height) public {
        vm.startBroadcast();
        
        // Deploy the PixelCanvas with the specified dimensions
        PixelCanvas canvas = new PixelCanvas(_width, _height);
        
        console.log("PixelCanvas deployed at:", address(canvas));
        console.log("Canvas dimensions: %s x %s", _width, _height);
        
        vm.stopBroadcast();
    }
    
    /// @notice Deploy the PixelCanvas contract with default dimensions (100x100)
    function run() public {
        run(64, 64);
    }
}
