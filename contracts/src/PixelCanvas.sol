// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Custom errors
error OutOfBoundsX();
error OutOfBoundsY();
error ValueOutOfBounds();
error TileIndexOutOfBounds();
error WipeOnCooldown();

/// @title PixelCanvas
/// @notice A contract that allows users to paint pixels on a canvas with RGB values
contract PixelCanvas {
    uint256 public width;
    uint256 public height;
    uint256 public size;

    // RGB buffers for the canvas
    uint8[] public rBuffer;
    uint8[] public gBuffer;
    uint8[] public bBuffer;
    
    // Wipe functionality
    uint256 public lastWipeTimestamp;
    uint256 public constant WIPE_COOLDOWN = 1 hours;

    event tilePainted(uint256 x, uint256 y, uint8 r, uint8 g, uint8 b);
    event tilesPainted(uint256[] indices, uint8 r, uint8 g, uint8 b);
    event sectionWritten(uint256 cursorX, uint256 cursorY, uint256 numPixels);
    event canvasWiped(address indexed wiper, uint256 timestamp);

    /// @notice Initialize the canvas with given dimensions
    /// @param _width Width of the canvas
    /// @param _height Height of the canvas
    constructor(uint256 _width, uint256 _height) {
        width = _width;
        height = _height;
        size = _width * _height;

        // Initialize the buffers with black (0,0,0)
        rBuffer = new uint8[](size);
        gBuffer = new uint8[](size);
        bBuffer = new uint8[](size);
    }

    /// @notice Maps x,y coordinates to buffer index
    /// @param _x X coordinate
    /// @param _y Y coordinate
    /// @return index Buffer index
    function _mapCoordinatesToIndex(uint256 _x, uint256 _y) internal view returns (uint256 index) {
        if (_x >= width) revert OutOfBoundsX();
        if (_y >= height) revert OutOfBoundsY();
        return _y * width + _x;
    }

    /// @notice Maps buffer index back to x,y coordinates
    /// @param _value Buffer index
    /// @return x X coordinate
    /// @return y Y coordinate
    function mapbuffer(uint256 _value) public view returns (uint256 x, uint256 y) {
        if (_value >= size) revert ValueOutOfBounds();
        return (_value % width, _value / width);
    }

    /// @notice Set the RGB value of a single tile
    /// @param _x X coordinate
    /// @param _y Y coordinate
    /// @param _r Red value (0-255)
    /// @param _g Green value (0-255)
    /// @param _b Blue value (0-255)
    function setTile(uint256 _x, uint256 _y, uint8 _r, uint8 _g, uint8 _b) public {
        uint256 index = _mapCoordinatesToIndex(_x, _y);
        rBuffer[index] = _r;
        gBuffer[index] = _g;
        bBuffer[index] = _b;
        emit tilePainted(_x, _y, _r, _g, _b);
    }

    /// @notice Get the RGB value of a single tile
    /// @param _x X coordinate
    /// @param _y Y coordinate
    /// @return r Red value
    /// @return g Green value
    /// @return b Blue value
    function getTile(uint256 _x, uint256 _y) public view returns (uint8, uint8, uint8) {
        uint256 index = _mapCoordinatesToIndex(_x, _y);
        return (rBuffer[index], gBuffer[index], bBuffer[index]);
    }

    /// @notice Paint multiple tiles with the same RGB value
    /// @param _tiles Array of indices to paint
    /// @param _r Red value (0-255)
    /// @param _g Green value (0-255)
    /// @param _b Blue value (0-255)
    function paintTiles(uint256[] memory _tiles, uint8 _r, uint8 _g, uint8 _b) public {
        for (uint256 i = 0; i < _tiles.length; i++) {
            if (_tiles[i] >= size) revert TileIndexOutOfBounds();
            rBuffer[_tiles[i]] = _r;
            gBuffer[_tiles[i]] = _g;
            bBuffer[_tiles[i]] = _b;
        }
        emit tilesPainted(_tiles, _r, _g, _b);
    }

    /// @notice Write a section of pixels starting from cursor position with different colors
    /// @param _cursorX Starting X coordinate
    /// @param _cursorY Starting Y coordinate
    /// @param _colors Array of RGB values packed as uint24 (R<<16 | G<<8 | B)
    /// @dev Writes pixels row by row from the cursor position
    function writeSection(uint256 _cursorX, uint256 _cursorY, uint24[] memory _colors) public {
        uint256 startIndex = _mapCoordinatesToIndex(_cursorX, _cursorY);
        
        for (uint256 i = 0; i < _colors.length; i++) {
            uint256 currentIndex = startIndex + i;
            
            // Check if we've gone beyond the canvas bounds
            if (currentIndex >= size) break;
            
            // Calculate current position to check bounds
            uint256 currentY = currentIndex / width;
            
            // If we've gone beyond the canvas height, stop
            if (currentY >= height) break;
            
            // Extract RGB from packed uint24
            uint8 r = uint8((_colors[i] >> 16) & 0xFF);
            uint8 g = uint8((_colors[i] >> 8) & 0xFF);
            uint8 b = uint8(_colors[i] & 0xFF);
            
            rBuffer[currentIndex] = r;
            gBuffer[currentIndex] = g;
            bBuffer[currentIndex] = b;
        }
        
        emit sectionWritten(_cursorX, _cursorY, _colors.length);
    }

    /// @notice Get all tiles' RGB values
    /// @return r Array of red values
    /// @return g Array of green values
    /// @return b Array of blue values
    function getTiles() public view returns (uint8[] memory, uint8[] memory, uint8[] memory) {
        return (rBuffer, gBuffer, bBuffer);
    }
    
    /// @notice Wipe the entire canvas to white (255, 255, 255)
    /// @dev Can only be called once per hour
    function wipeCanvas() public {
        if (lastWipeTimestamp != 0 && block.timestamp < lastWipeTimestamp + WIPE_COOLDOWN) {
            revert WipeOnCooldown();
        }
        
        lastWipeTimestamp = block.timestamp;
        
        // Set all pixels to white
        for (uint256 i = 0; i < size; i++) {
            rBuffer[i] = 255;
            gBuffer[i] = 255;
            bBuffer[i] = 255;
        }
        
        emit canvasWiped(msg.sender, block.timestamp);
    }
    
    /// @notice Get the timestamp when canvas can be wiped again
    /// @return timestamp The timestamp when next wipe is available (0 if available now)
    function getNextWipeTime() public view returns (uint256) {
        if (lastWipeTimestamp == 0) return 0;
        uint256 nextWipe = lastWipeTimestamp + WIPE_COOLDOWN;
        return block.timestamp >= nextWipe ? 0 : nextWipe;
    }
}
