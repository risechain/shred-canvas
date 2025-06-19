// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Custom errors
error OutOfBoundsX();
error OutOfBoundsY();
error ValueOutOfBounds();
error TileIndexOutOfBounds();

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

    event tilePainted(uint256 x, uint256 y, uint8 r, uint8 g, uint8 b);
    event tilesPainted(uint256[] indices, uint8 r, uint8 g, uint8 b);

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

    /// @notice Get all tiles' RGB values
    /// @return r Array of red values
    /// @return g Array of green values
    /// @return b Array of blue values
    function getTiles() public view returns (uint8[] memory, uint8[] memory, uint8[] memory) {
        return (rBuffer, gBuffer, bBuffer);
    }
}
