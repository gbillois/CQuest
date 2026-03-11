#!/usr/bin/env python3
"""Generate sprite-manifest.json by analyzing all PNG assets pixel-by-pixel."""

import json
import os
import sys
from pathlib import Path
from PIL import Image

GAME_ASSETS = Path(__file__).resolve().parent.parent / "game_assets"

def get_opaque_bounds(img_path):
    """Return content bounding box {x, y, w, h} of non-transparent pixels."""
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()

    min_x, min_y = w, h
    max_x, max_y = -1, -1

    for py in range(h):
        for px in range(w):
            if pixels[px, py][3] > 0:  # alpha > 0
                if px < min_x: min_x = px
                if px > max_x: max_x = px
                if py < min_y: min_y = py
                if py > max_y: max_y = py

    if max_x == -1:  # fully transparent
        return {"x": 0, "y": 0, "w": 0, "h": 0}

    return {
        "x": min_x,
        "y": min_y,
        "w": max_x - min_x + 1,
        "h": max_y - min_y + 1
    }

def scan_heroes():
    heroes_dir = GAME_ASSETS / "heroes"
    heroes = {}
    for hero_dir in sorted(heroes_dir.iterdir()):
        if not hero_dir.is_dir():
            continue
        hero_name = hero_dir.name
        hero_data = {"canvas_size": None, "rotations": {}, "animations": {}}

        # Rotations (static frames)
        rot_dir = hero_dir / "rotations"
        if rot_dir.exists():
            for png in sorted(rot_dir.glob("*.png")):
                img = Image.open(png)
                if hero_data["canvas_size"] is None:
                    hero_data["canvas_size"] = {"w": img.width, "h": img.height}
                direction = png.stem  # e.g. "south-east"
                hero_data["rotations"][direction] = {
                    "path": str(png.relative_to(GAME_ASSETS.parent)),
                    "content_bbox": get_opaque_bounds(png)
                }

        # Animations
        anim_dir = hero_dir / "animations"
        if anim_dir.exists():
            for anim_type_dir in sorted(anim_dir.iterdir()):
                if not anim_type_dir.is_dir():
                    continue
                anim_name = anim_type_dir.name  # e.g. "running-6-frames"
                hero_data["animations"][anim_name] = {}
                for dir_dir in sorted(anim_type_dir.iterdir()):
                    if not dir_dir.is_dir():
                        continue
                    direction = dir_dir.name
                    frames = []
                    for png in sorted(dir_dir.glob("*.png")):
                        img = Image.open(png)
                        if hero_data["canvas_size"] is None:
                            hero_data["canvas_size"] = {"w": img.width, "h": img.height}
                        frames.append({
                            "path": str(png.relative_to(GAME_ASSETS.parent)),
                            "content_bbox": get_opaque_bounds(png)
                        })
                    if frames:
                        hero_data["animations"][anim_name][direction] = frames

        heroes[hero_name] = hero_data
    return heroes

def scan_enemies():
    enemies_dir = GAME_ASSETS / "enemies"
    enemies = {}
    for enemy_dir in sorted(enemies_dir.iterdir()):
        if not enemy_dir.is_dir():
            continue
        enemy_name = enemy_dir.name
        enemy_data = {"canvas_size": None, "rotations": {}, "animations": {}, "walk": {}}

        rot_dir = enemy_dir / "rotations"
        if rot_dir.exists():
            for png in sorted(rot_dir.glob("*.png")):
                img = Image.open(png)
                if enemy_data["canvas_size"] is None:
                    enemy_data["canvas_size"] = {"w": img.width, "h": img.height}
                enemy_data["rotations"][png.stem] = {
                    "path": str(png.relative_to(GAME_ASSETS.parent)),
                    "content_bbox": get_opaque_bounds(png)
                }

        # Walk directory (some enemies have this)
        walk_dir = enemy_dir / "walk"
        if walk_dir.exists():
            for dir_dir in sorted(walk_dir.iterdir()):
                if not dir_dir.is_dir():
                    continue
                frames = []
                for png in sorted(dir_dir.glob("*.png")):
                    img = Image.open(png)
                    if enemy_data["canvas_size"] is None:
                        enemy_data["canvas_size"] = {"w": img.width, "h": img.height}
                    frames.append({
                        "path": str(png.relative_to(GAME_ASSETS.parent)),
                        "content_bbox": get_opaque_bounds(png)
                    })
                if frames:
                    enemy_data["walk"][dir_dir.name] = frames

        # Animations
        anim_dir = enemy_dir / "animations"
        if anim_dir.exists():
            for anim_type_dir in sorted(anim_dir.iterdir()):
                if not anim_type_dir.is_dir():
                    continue
                anim_name = anim_type_dir.name
                enemy_data["animations"][anim_name] = {}
                for dir_dir in sorted(anim_type_dir.iterdir()):
                    if not dir_dir.is_dir():
                        continue
                    frames = []
                    for png in sorted(dir_dir.glob("*.png")):
                        img = Image.open(png)
                        if enemy_data["canvas_size"] is None:
                            enemy_data["canvas_size"] = {"w": img.width, "h": img.height}
                        frames.append({
                            "path": str(png.relative_to(GAME_ASSETS.parent)),
                            "content_bbox": get_opaque_bounds(png)
                        })
                    if frames:
                        enemy_data["animations"][anim_name][dir_dir.name] = frames

        enemies[enemy_name] = enemy_data
    return enemies

def scan_tiles():
    tiles_dir = GAME_ASSETS / "tiles"
    tiles = {}
    for biome_dir in sorted(tiles_dir.iterdir()):
        if not biome_dir.is_dir():
            continue
        biome = biome_dir.name
        biome_tiles = []
        for png in sorted(biome_dir.glob("*.png")):
            img = Image.open(png)
            biome_tiles.append({
                "path": str(png.relative_to(GAME_ASSETS.parent)),
                "name": png.stem,
                "canvas_size": {"w": img.width, "h": img.height},
                "content_bbox": get_opaque_bounds(png)
            })
        tiles[biome] = biome_tiles
    return tiles

def scan_simple_dir(dirname):
    d = GAME_ASSETS / dirname
    items = []
    if not d.exists():
        return items
    for png in sorted(d.glob("*.png")):
        img = Image.open(png)
        items.append({
            "path": str(png.relative_to(GAME_ASSETS.parent)),
            "name": png.stem,
            "canvas_size": {"w": img.width, "h": img.height},
            "content_bbox": get_opaque_bounds(png)
        })
    return items

def scan_backgrounds():
    d = GAME_ASSETS / "backgrounds"
    items = []
    if not d.exists():
        return items
    for png in sorted(d.glob("*.png")):
        img = Image.open(png)
        # Skip pixel analysis for large backgrounds - just record size
        items.append({
            "path": str(png.relative_to(GAME_ASSETS.parent)),
            "name": png.stem,
            "canvas_size": {"w": img.width, "h": img.height}
        })
    return items

def main():
    print("Scanning heroes...", file=sys.stderr)
    heroes = scan_heroes()
    print("Scanning enemies...", file=sys.stderr)
    enemies = scan_enemies()
    print("Scanning tiles...", file=sys.stderr)
    tiles = scan_tiles()
    print("Scanning bonus...", file=sys.stderr)
    bonus = scan_simple_dir("bonus")
    print("Scanning decorations...", file=sys.stderr)
    decorations = scan_simple_dir("decoration")
    print("Scanning castles...", file=sys.stderr)
    castles = scan_simple_dir("castle")
    print("Scanning tower...", file=sys.stderr)
    tower = scan_simple_dir("tower")
    print("Scanning UI...", file=sys.stderr)
    ui = scan_simple_dir("UI")
    print("Scanning backgrounds...", file=sys.stderr)
    backgrounds = scan_backgrounds()

    manifest = {
        "_meta": {
            "generated": "auto",
            "description": "Pixel-level sprite analysis for ConjugQuest. content_bbox = opaque pixel bounds within canvas."
        },
        "heroes": heroes,
        "enemies": enemies,
        "tiles": tiles,
        "bonus": bonus,
        "decorations": decorations,
        "castles": castles,
        "tower": tower,
        "ui": ui,
        "backgrounds": backgrounds
    }

    output = GAME_ASSETS.parent / "sprite-manifest.json"
    with open(output, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Written to {output}", file=sys.stderr)

if __name__ == "__main__":
    main()
