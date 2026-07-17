"""Generate the EnerTwin campus GLB used by the interactive digital twin.

Run with Blender in background mode:
  blender --background --python scripts/generate-campus.py

The model deliberately keeps the campus geometry independent from the dashboard UI.
Building shells are UV mapped to the generated facade atlas while the plaza and
roads use the generated top-down ground texture. Neon trim remains real geometry
so the browser renderer can drive bloom and mode emphasis at runtime.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets"
OUTPUT = ASSET_DIR / "enertwin-campus.glb"
PREVIEW = ASSET_DIR / "enertwin-campus-preview.png"
FACADE = ASSET_DIR / "twin-facade-atlas.png"
GROUND = ASSET_DIR / "twin-ground-grid.png"


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def socket(node, *names):
    for name in names:
        if name in node.inputs:
            return node.inputs[name]
    raise KeyError(f"No matching socket {names} on {node.name}")


def pbr_material(
    name: str,
    base: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.45,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    socket(bsdf, "Base Color").default_value = base
    socket(bsdf, "Metallic").default_value = metallic
    socket(bsdf, "Roughness").default_value = roughness
    if emission:
        socket(bsdf, "Emission Color", "Emission").default_value = emission
        socket(bsdf, "Emission Strength").default_value = emission_strength
    return mat


def image_material(
    name: str,
    image_path: Path,
    fallback: tuple[float, float, float, float],
    *,
    emission_strength: float = 0.0,
    roughness: float = 0.35,
    metallic: float = 0.12,
) -> bpy.types.Material:
    mat = pbr_material(name, fallback, metallic=metallic, roughness=roughness)
    if not image_path.exists():
        return mat
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    tex = nodes.new("ShaderNodeTexImage")
    tex.name = f"{name}_UV_TEXTURE"
    tex.image = bpy.data.images.load(str(image_path), check_existing=True)
    tex.interpolation = "Linear"
    links.new(tex.outputs["Color"], socket(bsdf, "Base Color"))
    if emission_strength:
        links.new(tex.outputs["Color"], socket(bsdf, "Emission Color", "Emission"))
        socket(bsdf, "Emission Strength").default_value = emission_strength
    return mat


def smart_uv(obj: bpy.types.Object, margin: float = 0.02) -> None:
    if obj.type != "MESH":
        return
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=margin)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    bevel: float = 0.0,
    uv: bool = False,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("EdgeSoftness", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if uv:
        smart_uv(obj)
    return obj


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    vertices: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def tube_curve(
    name: str,
    points: list[tuple[float, float, float]],
    material: bpy.types.Material,
    bevel_depth: float = 0.045,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(name=f"{name}_CURVE", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = bevel_depth
    curve_data.bevel_resolution = 2
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def join_objects(objects: list[bpy.types.Object], name: str) -> bpy.types.Object | None:
    if not objects:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    joined.select_set(False)
    return joined


def add_neon_frame(
    prefix: str,
    x: float,
    y: float,
    z: float,
    w: float,
    d: float,
    h: float,
    material: bpy.types.Material,
) -> None:
    rail = 0.075
    top_z = z + h / 2 + 0.035
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(
                f"{prefix}_CORNER_{sx}_{sy}",
                (x + sx * (w / 2 - rail / 2), y + sy * (d / 2 - rail / 2), z),
                (rail, rail, h),
                material,
            )
    for sy in (-1, 1):
        box(f"{prefix}_ROOF_X_{sy}", (x, y + sy * d / 2, top_z), (w + 0.08, rail, rail), material)
    for sx in (-1, 1):
        box(f"{prefix}_ROOF_Y_{sx}", (x + sx * w / 2, y, top_z), (rail, d + 0.08, rail), material)


def add_solar_roof(prefix: str, x: float, y: float, top: float, w: float, d: float) -> None:
    panel_w = min(1.45, (w - 1.0) / 4)
    panel_d = min(1.9, (d - 0.8) / 2)
    frame_parts: list[bpy.types.Object] = []
    for row in range(2):
        for col in range(4):
            px = x - 1.5 * (panel_w + 0.12) + col * (panel_w + 0.12)
            py = y - 0.5 * (panel_d + 0.14) + row * (panel_d + 0.14)
            panel = box(
                f"{prefix}_PV_{row}_{col}",
                (px, py, top + 0.16),
                (panel_w, panel_d, 0.085),
                SOLAR,
                bevel=0.025,
            )
            panel.rotation_euler.x = math.radians(3)
            rail = 0.055
            frame_parts.extend([
                box(f"{prefix}_PV_FRAME_X1_{row}_{col}", (px, py - panel_d / 2, top + 0.225), (panel_w, rail, rail), PV_GRID),
                box(f"{prefix}_PV_FRAME_X2_{row}_{col}", (px, py + panel_d / 2, top + 0.225), (panel_w, rail, rail), PV_GRID),
                box(f"{prefix}_PV_FRAME_Y1_{row}_{col}", (px - panel_w / 2, py, top + 0.225), (rail, panel_d, rail), PV_GRID),
                box(f"{prefix}_PV_FRAME_Y2_{row}_{col}", (px + panel_w / 2, py, top + 0.225), (rail, panel_d, rail), PV_GRID),
                box(f"{prefix}_PV_CELL_X_{row}_{col}", (px, py, top + 0.228), (panel_w, rail * 0.72, rail), PV_GRID),
                box(f"{prefix}_PV_CELL_Y_{row}_{col}", (px, py, top + 0.228), (rail * 0.72, panel_d, rail), PV_GRID),
            ])
    join_objects(frame_parts, f"{prefix}_PV_FRAMES")


def add_facade_windows(code: str, x: float, y: float, w: float, d: float, h: float) -> None:
    cyan_windows: list[bpy.types.Object] = []
    warm_windows: list[bpy.types.Object] = []
    facade_bands: list[bpy.types.Object] = []
    rows = max(4, int((h - 0.45) / 0.9))
    front_cols = max(5, int(w / 1.0))
    side_cols = max(4, int(d / 1.0))
    window_h = min(0.54, (h - 0.8) / rows * 0.62)

    def register(obj: bpy.types.Object, row: int, col: int, face: int) -> None:
        (warm_windows if (row * 3 + col + face * 2) % 8 == 0 else cyan_windows).append(obj)

    for face, face_y in enumerate((y - d / 2 - 0.035, y + d / 2 + 0.035)):
        for row in range(rows):
            wz = 0.94 + row * ((h - 0.75) / rows)
            for col in range(front_cols):
                wx = x - w / 2 + (col + 0.5) * (w / front_cols)
                material = WINDOW_WARM if (row * 3 + col + face * 2) % 8 == 0 else WINDOW_CYAN
                window = box(
                    f"{code}_WINDOW_FB_{face}_{row}_{col}",
                    (wx, face_y, wz),
                    (w / front_cols * 0.31, 0.045, window_h),
                    material,
                )
                register(window, row, col, face)

    for face, face_x in enumerate((x - w / 2 - 0.035, x + w / 2 + 0.035), start=2):
        for row in range(rows):
            wz = 0.94 + row * ((h - 0.75) / rows)
            for col in range(side_cols):
                wy = y - d / 2 + (col + 0.5) * (d / side_cols)
                material = WINDOW_WARM if (row * 3 + col + face * 2) % 8 == 0 else WINDOW_CYAN
                window = box(
                    f"{code}_WINDOW_SIDE_{face}_{row}_{col}",
                    (face_x, wy, wz),
                    (0.045, d / side_cols * 0.31, window_h),
                    material,
                )
                register(window, row, col, face)

    for row in range(rows + 1):
        band_z = 0.66 + row * ((h - 0.4) / rows)
        facade_bands.extend([
            box(f"{code}_BAND_FRONT_{row}", (x, y - d / 2 - 0.055, band_z), (w, 0.035, 0.035), FACADE_RAIL),
            box(f"{code}_BAND_BACK_{row}", (x, y + d / 2 + 0.055, band_z), (w, 0.035, 0.035), FACADE_RAIL),
            box(f"{code}_BAND_LEFT_{row}", (x - w / 2 - 0.055, y, band_z), (0.035, d, 0.035), FACADE_RAIL),
            box(f"{code}_BAND_RIGHT_{row}", (x + w / 2 + 0.055, y, band_z), (0.035, d, 0.035), FACADE_RAIL),
        ])
    for col in range(1, front_cols):
        column_x = x - w / 2 + col * (w / front_cols)
        facade_bands.extend([
            box(f"{code}_MULLION_FRONT_{col}", (column_x, y - d / 2 - 0.058, h / 2 + 0.34), (0.035, 0.035, h), FACADE_RAIL),
            box(f"{code}_MULLION_BACK_{col}", (column_x, y + d / 2 + 0.058, h / 2 + 0.34), (0.035, 0.035, h), FACADE_RAIL),
        ])
    for col in range(1, side_cols):
        column_y = y - d / 2 + col * (d / side_cols)
        facade_bands.extend([
            box(f"{code}_MULLION_LEFT_{col}", (x - w / 2 - 0.058, column_y, h / 2 + 0.34), (0.035, 0.035, h), FACADE_RAIL),
            box(f"{code}_MULLION_RIGHT_{col}", (x + w / 2 + 0.058, column_y, h / 2 + 0.34), (0.035, 0.035, h), FACADE_RAIL),
        ])
    join_objects(cyan_windows, f"{code}_WINDOWS_CYAN")
    join_objects(warm_windows, f"{code}_WINDOWS_WARM")
    join_objects(facade_bands, f"{code}_FACADE_BANDS")


def add_building(
    code: str,
    location: tuple[float, float],
    dimensions: tuple[float, float, float],
    trim: bpy.types.Material,
) -> None:
    x, y = location
    w, d, h = dimensions
    shell = box(
        f"BUILDING_{code}",
        (x, y, h / 2 + 0.34),
        dimensions,
        FACADE_MAT,
        bevel=0.16,
        uv=True,
    )
    shell["buildingCode"] = code
    shell["interactive"] = True
    box(f"{code}_PLINTH", (x, y, 0.28), (w + 0.55, d + 0.55, 0.32), ROOF, bevel=0.08)
    box(f"{code}_ROOF", (x, y, h + 0.46), (w + 0.28, d + 0.28, 0.22), ROOF, bevel=0.08)
    add_neon_frame(code, x, y, h / 2 + 0.34, w, d, h, trim)
    add_facade_windows(code, x, y, w, d, h)
    # Recess the entrance into the facade.  The former protruding pale box read as
    # a large grey door from the overview camera and did not exist in the target.
    lobby_width = w * 0.24
    pane_width = lobby_width / 3 * 0.68
    for pane in range(3):
        pane_x = x - lobby_width / 3 + pane * lobby_width / 3
        box(
            f"{code}_LOBBY_GLASS_{pane}",
            (pane_x, y - d / 2 - 0.064, 1.12),
            (pane_width, 0.055, 1.42),
            LOBBY_GLASS,
            bevel=0.018,
        )
    box(f"{code}_LOBBY_HEADER", (x, y - d / 2 - 0.068, 1.9), (lobby_width, 0.06, 0.055), FACADE_RAIL)
    add_solar_roof(code, x, y, h + 0.58, w, d)
    # The UV-baked facade atlas carries the dense warm/cyan window pattern.
    # Keeping it in one shell mesh avoids hundreds of browser draw calls.


def add_storage_station() -> None:
    x, y = -22.5, 5.5
    base = box("STORAGE_BASE", (x, y, 0.25), (8.4, 5.8, 0.28), ROOF, bevel=0.12)
    base["interactive"] = True
    shell = box("STORAGE_STATION_SHELL", (x, y, 1.44), (7.1, 4.35, 2.2), STORAGE_DARK, bevel=0.14, uv=True)
    shell["interactive"] = True
    add_neon_frame("STORAGE_STATION", x, y, 1.44, 7.1, 4.35, 2.2, FACILITY_GREEN)
    box("STORAGE_ROOF", (x, y, 2.63), (7.45, 4.68, 0.16), ROOF, bevel=0.07)
    add_solar_roof("STORAGE", x, y, 2.76, 7.05, 4.25)
    # Six flush battery bays reproduce the compact green-window rhythm in the reference.
    for index in range(6):
        module_x = x - 2.75 + index * 1.1
        panel = box(
            f"STORAGE_BATTERY_BAY_{index}",
            (module_x, y - 2.205, 1.38),
            (0.72, 0.055, 1.12),
            STORAGE_WINDOW,
            bevel=0.025,
        )
        panel["interactive"] = True
        box(f"STORAGE_BAY_DIVIDER_{index}", (module_x + 0.47, y - 2.21, 1.38), (0.04, 0.055, 1.5), FACILITY_GREEN)
        for vent in range(3):
            box(f"STORAGE_VENT_{index}_{vent}", (module_x, y - 2.24, 0.72 + vent * 0.15), (0.54, 0.03, 0.035), FACADE_RAIL)
    # A restrained PCS module sits behind the main enclosure and no longer dominates the overview.
    box("STORAGE_PCS", (x + 3.65, y + 1.15, 1.02), (1.05, 1.5, 1.5), GRID_METAL, bevel=0.08)
    for fin in range(5):
        box("STORAGE_PCS_FIN", (x + 4.19, y + 0.67 + fin * 0.24, 1.02), (0.05, 0.1, 1.02), FACADE_RAIL)
    cylinder("STORAGE_WARNING_BEACON", (x + 3.65, y + 1.15, 1.88), 0.075, 0.16, FACILITY_AMBER, 12)


def add_charging_station() -> None:
    # Keep an explicit service-road gap from C3 and D4 at every orbit angle.
    x, y = 24.5, -1.0
    base = box("CHARGING_BASE", (x, y - 0.85, 0.25), (9.8, 7.0, 0.28), ROAD, bevel=0.12)
    base["interactive"] = True
    canopy_y = y + 0.15
    box("CHARGING_CANOPY", (x, canopy_y, 3.12), (9.0, 3.45, 0.16), ROOF, bevel=0.08)
    for edge_y in (canopy_y - 1.72, canopy_y + 1.72):
        box("CHARGING_CANOPY_EDGE", (x, edge_y, 3.2), (9.05, 0.055, 0.055), FACILITY_CYAN)
    for edge_x in (x - 4.5, x + 4.5):
        box("CHARGING_CANOPY_EDGE", (edge_x, canopy_y, 3.2), (0.055, 3.45, 0.055), FACILITY_CYAN)
    # A single clean PV row matches the reference canopy silhouette.
    for col in range(5):
        panel_x = x - 3.44 + col * 1.72
        box(f"CHARGING_PV_0_{col}", (panel_x, canopy_y, 3.25), (1.56, 2.86, 0.09), SOLAR, bevel=0.025)
        box(f"CHARGING_PV_FRAME_X1_0_{col}", (panel_x, canopy_y - 1.43, 3.31), (1.56, 0.035, 0.035), PV_GRID)
        box(f"CHARGING_PV_FRAME_X2_0_{col}", (panel_x, canopy_y + 1.43, 3.31), (1.56, 0.035, 0.035), PV_GRID)
        box(f"CHARGING_PV_FRAME_Y1_0_{col}", (panel_x - 0.78, canopy_y, 3.31), (0.035, 2.86, 0.035), PV_GRID)
        box(f"CHARGING_PV_FRAME_Y2_0_{col}", (panel_x + 0.78, canopy_y, 3.31), (0.035, 2.86, 0.035), PV_GRID)
        box(f"CHARGING_PV_CELL_X_0_{col}", (panel_x, canopy_y, 3.315), (1.56, 0.035, 0.035), PV_GRID)
        box(f"CHARGING_PV_CELL_Y_0_{col}", (panel_x, canopy_y, 3.315), (0.035, 2.86, 0.035), PV_GRID)
    for index in range(5):
        charger_x = x - 3.44 + index * 1.72
        charger_y = y - 1.45
        charger = box(f"CHARGER_{index + 1:02d}", (charger_x, charger_y, 1.18), (0.64, 0.68, 1.9), CHARGER_DARK, bevel=0.1)
        charger["interactive"] = True
        box(f"CHARGER_SCREEN_{index}", (charger_x, charger_y - 0.355, 1.48), (0.4, 0.045, 0.48), CHARGER_SCREEN, bevel=0.03)
        box(f"CHARGER_STATUS_{index}", (charger_x, charger_y - 0.365, 1.8), (0.38, 0.04, 0.09), FACILITY_VIOLET)
        box(f"CHARGER_BASE_{index}", (charger_x, charger_y, 0.25), (0.86, 0.82, 0.14), FACILITY_CYAN, bevel=0.025)
        tube_curve(
            f"CHARGER_CABLE_{index}",
            [
                (charger_x + 0.29, charger_y - 0.28, 1.5),
                (charger_x + 0.58, charger_y - 0.5, 1.18),
                (charger_x + 0.54, charger_y - 0.58, 0.72),
            ],
            FACILITY_VIOLET,
            0.035,
        )
        bay_center_y = y - 3.25
        bay_width, bay_depth = 1.42, 2.15
        box(f"CHARGING_BAY_TOP_{index}", (charger_x, bay_center_y - bay_depth / 2, 0.43), (bay_width, 0.045, 0.035), FACILITY_CYAN)
        box(f"CHARGING_BAY_BOTTOM_{index}", (charger_x, bay_center_y + bay_depth / 2, 0.43), (bay_width, 0.045, 0.035), FACILITY_CYAN)
        box(f"CHARGING_BAY_LEFT_{index}", (charger_x - bay_width / 2, bay_center_y, 0.43), (0.045, bay_depth, 0.035), FACILITY_CYAN)
        box(f"CHARGING_BAY_RIGHT_{index}", (charger_x + bay_width / 2, bay_center_y, 0.43), (0.045, bay_depth, 0.035), FACILITY_CYAN)
    for support_x in (x - 4.15, x + 4.15):
        for support_y in (canopy_y - 1.35, canopy_y + 1.35):
            cylinder("CHARGING_SUPPORT", (support_x, support_y, 1.66), 0.1, 3.0, GRID_METAL, 12)


def add_substation() -> None:
    # Center the grid intake in the dedicated rear service bay between A1 and C3.
    x, y = 0.0, 12.0
    base = box("GRID_BASE", (x, y, 0.25), (8.8, 5.0, 0.28), ROAD, bevel=0.08)
    base["interactive"] = True
    for transformer_index in range(4):
        tx = x - 2.7 + transformer_index * 1.8
        ty = y - 0.55
        transformer = box(f"GRID_TRANSFORMER_{transformer_index}", (tx, ty, 1.05), (1.18, 1.35, 1.48), GRID_METAL, bevel=0.1)
        transformer["interactive"] = True
        box(f"GRID_FRONT_PANEL_{transformer_index}", (tx, ty - 0.7, 1.14), (0.68, 0.045, 0.78), GRID_PANEL, bevel=0.025)
        for fin in range(4):
            fin_y = ty - 0.42 + fin * 0.28
            box(f"GRID_COOLING_FIN_{transformer_index}_{fin}", (tx - 0.64, fin_y, 1.05), (0.07, 0.1, 1.04), FACADE_RAIL)
            box(f"GRID_COOLING_FIN_R_{transformer_index}_{fin}", (tx + 0.64, fin_y, 1.05), (0.07, 0.1, 1.04), FACADE_RAIL)
        for bushing in range(3):
            bx = tx - 0.34 + bushing * 0.34
            cylinder(f"GRID_BUSHING_{transformer_index}_{bushing}", (bx, ty, 2.05), 0.075, 0.58, GRID_CERAMIC, 12)
            cylinder(f"GRID_BUSHING_CAP_{transformer_index}_{bushing}", (bx, ty, 2.36), 0.105, 0.09, FACILITY_CYAN, 12)
        box(f"GRID_STATUS_{transformer_index}", (tx, ty - 0.725, 1.55), (0.54, 0.045, 0.12), FACILITY_GREEN)

    # Compact four-bay bus and isolator row, matching the small right-side reference unit.
    gantry_y = y + 1.65
    for pole_index, pole_x in enumerate((x - 3.0, x, x + 3.0)):
        cylinder(f"GRID_GANTRY_POLE_{pole_index}", (pole_x, gantry_y, 1.9), 0.085, 3.25, GRID_METAL, 12)
        box(f"GRID_GANTRY_ARM_{pole_index}", (pole_x, gantry_y, 3.08), (1.3, 0.09, 0.09), FACILITY_CYAN)
    box("GRID_GANTRY_BUS", (x, gantry_y, 3.52), (7.0, 0.075, 0.075), FACILITY_CYAN)
    for transformer_index in range(4):
        tx = x - 2.7 + transformer_index * 1.8
        tube_curve(
            f"GRID_CABLE_{transformer_index}",
            [(tx, gantry_y, 3.42), (tx, y + 0.55, 2.92), (tx, ty, 2.36)],
            FACILITY_CYAN,
            0.026,
        )


def add_tree(name: str, x: float, y: float, scale: float = 1.0) -> None:
    cylinder(f"{name}_TRUNK", (x, y, 0.55 * scale), 0.085 * scale, 1.1 * scale, TRUNK, 10)
    tube_curve(f"{name}_BRANCH_L", [(x, y, 0.78 * scale), (x - 0.28 * scale, y, 1.16 * scale)], TRUNK, 0.035 * scale)
    tube_curve(f"{name}_BRANCH_R", [(x, y, 0.86 * scale), (x + 0.26 * scale, y + 0.12 * scale, 1.22 * scale)], TRUNK, 0.032 * scale)
    crown_specs = [
        (0.0, 0.0, 1.56, 0.55, LEAF),
        (-0.36, -0.06, 1.38, 0.43, LEAF_DARK),
        (0.34, 0.02, 1.42, 0.44, LEAF_LIGHT),
        (-0.12, 0.32, 1.48, 0.4, LEAF_LIGHT),
        (0.12, -0.3, 1.46, 0.4, LEAF_DARK),
    ]
    crowns: list[bpy.types.Object] = []
    for crown_index, (ox, oy, oz, radius, material) in enumerate(crown_specs):
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2,
            radius=radius * scale,
            location=(x + ox * scale, y + oy * scale, oz * scale),
        )
        crown = bpy.context.object
        crown.name = f"{name}_CROWN_{crown_index}"
        crown.scale = (1.0, 0.92, 1.12)
        crown.data.materials.append(material)
        crowns.append(crown)


def add_environment() -> None:
    ground = box("CAMPUS_GROUND", (0, 0, 0), (60, 42, 0.32), GROUND_MAT, bevel=0.25, uv=True)
    ground["surface"] = "campus"
    # Main road lanes and plazas mirror the target's luminous route network.
    box("ROAD_EAST_WEST", (0, -14.8, 0.22), (58, 4.4, 0.14), ROAD)
    box("ROAD_NORTH_SOUTH", (27.0, 0, 0.23), (4.1, 39.5, 0.14), ROAD)
    box("CENTRAL_PLAZA", (0, 0, 0.24), (12.5, 8.8, 0.16), PLAZA, bevel=0.2)
    for index, (x, y) in enumerate([
        (-28, -9), (-28, 0), (-28, 10), (-21, -17), (-11, -17), (0, -17), (11, -17), (21, -17),
        (28, -10), (28, 0), (28, 10), (-19, 18), (-9, 18), (3, 18), (14, 18),
        (-9, 12), (4, 12), (-7, 1), (8, 1), (-21, -11), (22, 13),
    ]):
        add_tree(f"TREE_{index}", x, y, 0.82 + (index % 3) * 0.09)


def add_lighting() -> None:
    bpy.context.scene.world.color = (0.002, 0.009, 0.025)
    bpy.ops.object.light_add(type="AREA", location=(-10, -6, 22))
    key = bpy.context.object
    key.name = "BLENDER_KEY_CYAN"
    key.data.energy = 1450
    key.data.color = (0.16, 0.72, 1.0)
    key.data.shape = "DISK"
    key.data.size = 16
    bpy.ops.object.light_add(type="AREA", location=(14, 8, 15))
    fill = bpy.context.object
    fill.name = "BLENDER_FILL_GREEN"
    fill.data.energy = 1000
    fill.data.color = (0.12, 1.0, 0.52)
    fill.data.size = 12
    for x, y, color in [(-16, 5, (0.1, 1.0, 0.48)), (15, -1, (0.38, 0.18, 1.0)), (8, 4, (0.0, 0.75, 1.0))]:
        bpy.ops.object.light_add(type="POINT", location=(x, y, 4.5))
        point = bpy.context.object
        point.data.energy = 420
        point.data.color = color
        point.data.shadow_soft_size = 2.5


def setup_preview_camera() -> None:
    bpy.ops.object.camera_add(location=(43, -55, 39))
    camera = bpy.context.object
    camera.name = "REFERENCE_STYLE_CAMERA"
    bpy.context.scene.camera = camera
    target = (0.0, 0.0, 2.8)
    direction = tuple(target[i] - camera.location[i] for i in range(3))
    camera.rotation_euler = bpy_extras_object_track(direction)
    camera.data.lens = 49
    scene = bpy.context.scene
    # Blender 5.2 exposes the current Eevee renderer under BLENDER_EEVEE.
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1748
    scene.render.resolution_y = 1032
    scene.render.resolution_percentage = 45
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    scene.render.film_transparent = True


def bpy_extras_object_track(direction):
    from mathutils import Vector

    return Vector(direction).to_track_quat("-Z", "Y").to_euler()


def export_scene() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    blend_path = ASSET_DIR / "enertwin-campus.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    # Reload the generated scene before glTF export. Blender 5.2 is more stable
    # exporting this dense procedural scene after its datablocks have been flushed.
    bpy.ops.wm.open_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )
    print(f"Exported {OUTPUT}")


reset_scene()

FACADE_MAT = image_material("UV_BAKED_FACADE", FACADE, (0.012, 0.065, 0.11, 1), emission_strength=0.78, roughness=0.3, metallic=0.25)
GROUND_MAT = image_material("UV_BAKED_GROUND", GROUND, (0.015, 0.055, 0.08, 1), emission_strength=0.72, roughness=0.58, metallic=0.08)
ROOF = pbr_material("ROOF_DARK", (0.015, 0.055, 0.10, 1), metallic=0.34, roughness=0.3)
ROAD = pbr_material("ROAD_ASPHALT", (0.012, 0.026, 0.045, 1), roughness=0.74)
PLAZA = pbr_material("PLAZA_GLASS", (0.02, 0.11, 0.16, 1), metallic=0.16, roughness=0.42)
METAL = pbr_material("TECH_METAL", (0.16, 0.31, 0.39, 1), metallic=0.68, roughness=0.24)
SOLAR = pbr_material("SOLAR_PV", (0.012, 0.18, 0.31, 1), metallic=0.45, roughness=0.16, emission=(0.0, 0.48, 0.95, 1), emission_strength=0.65)
STORAGE = pbr_material("STORAGE_SHELL", (0.04, 0.15, 0.16, 1), metallic=0.3, roughness=0.35, emission=(0.05, 0.8, 0.35, 1), emission_strength=0.6)
CHARGER = pbr_material("CHARGER_SHELL", (0.08, 0.05, 0.20, 1), metallic=0.35, roughness=0.25, emission=(0.38, 0.16, 1.0, 1), emission_strength=0.72)
NEON_CYAN = pbr_material("NEON_CYAN", (0.0, 0.55, 0.95, 1), roughness=0.18, emission=(0.0, 0.78, 1.0, 1), emission_strength=5.2)
NEON_GREEN = pbr_material("NEON_GREEN", (0.02, 0.62, 0.25, 1), roughness=0.18, emission=(0.05, 1.0, 0.38, 1), emission_strength=4.6)
NEON_AMBER = pbr_material("NEON_AMBER", (0.82, 0.34, 0.02, 1), roughness=0.18, emission=(1.0, 0.52, 0.02, 1), emission_strength=4.8)
NEON_VIOLET = pbr_material("NEON_VIOLET", (0.35, 0.11, 0.92, 1), roughness=0.18, emission=(0.48, 0.18, 1.0, 1), emission_strength=5.0)
WINDOW_CYAN = pbr_material("WINDOW_CYAN", (0.02, 0.18, 0.34, 1), roughness=0.19, emission=(0.02, 0.47, 0.82, 1), emission_strength=1.02)
WINDOW_WARM = pbr_material("WINDOW_WARM", (0.34, 0.18, 0.05, 1), roughness=0.24, emission=(0.92, 0.4, 0.08, 1), emission_strength=0.9)
FACADE_RAIL = pbr_material("FACADE_RAIL", (0.03, 0.22, 0.34, 1), metallic=0.36, roughness=0.24, emission=(0.02, 0.52, 0.78, 1), emission_strength=0.78)
PV_GRID = pbr_material("PV_GRID", (0.02, 0.30, 0.48, 1), metallic=0.42, roughness=0.2, emission=(0.02, 0.58, 0.92, 1), emission_strength=0.56)
LEAF = pbr_material("TREE_FOLIAGE", (0.04, 0.28, 0.13, 1), roughness=0.74, emission=(0.02, 0.38, 0.08, 1), emission_strength=0.36)
LEAF_DARK = pbr_material("TREE_FOLIAGE_DARK", (0.018, 0.17, 0.07, 1), roughness=0.8, emission=(0.01, 0.19, 0.04, 1), emission_strength=0.22)
LEAF_LIGHT = pbr_material("TREE_FOLIAGE_LIGHT", (0.07, 0.37, 0.16, 1), roughness=0.72, emission=(0.03, 0.42, 0.09, 1), emission_strength=0.3)
TRUNK = pbr_material("TREE_TRUNK", (0.16, 0.10, 0.06, 1), roughness=0.8)
LOBBY_GLASS = pbr_material("LOBBY_GLASS", (0.012, 0.08, 0.13, 1), metallic=0.18, roughness=0.22, emission=(0.01, 0.22, 0.34, 1), emission_strength=0.24)
STORAGE_DARK = pbr_material("STORAGE_DARK", (0.025, 0.1, 0.12, 1), metallic=0.32, roughness=0.34, emission=(0.02, 0.22, 0.12, 1), emission_strength=0.2)
STORAGE_WINDOW = pbr_material("STORAGE_WINDOW", (0.03, 0.26, 0.15, 1), metallic=0.18, roughness=0.22, emission=(0.03, 0.78, 0.28, 1), emission_strength=0.72)
CHARGER_DARK = pbr_material("CHARGER_DARK", (0.025, 0.04, 0.105, 1), metallic=0.42, roughness=0.26)
CHARGER_SCREEN = pbr_material("CHARGER_SCREEN", (0.01, 0.22, 0.42, 1), metallic=0.16, roughness=0.2, emission=(0.0, 0.62, 1.0, 1), emission_strength=0.9)
GRID_METAL = pbr_material("GRID_METAL", (0.07, 0.14, 0.2, 1), metallic=0.62, roughness=0.28)
GRID_PANEL = pbr_material("GRID_PANEL", (0.015, 0.14, 0.3, 1), metallic=0.18, roughness=0.2, emission=(0.0, 0.52, 0.95, 1), emission_strength=0.62)
GRID_CERAMIC = pbr_material("GRID_CERAMIC", (0.15, 0.24, 0.3, 1), metallic=0.05, roughness=0.34, emission=(0.02, 0.2, 0.3, 1), emission_strength=0.18)
FACILITY_CYAN = pbr_material("FACILITY_CYAN", (0.0, 0.28, 0.48, 1), roughness=0.22, emission=(0.0, 0.62, 0.92, 1), emission_strength=0.62)
FACILITY_GREEN = pbr_material("FACILITY_GREEN", (0.02, 0.34, 0.16, 1), roughness=0.22, emission=(0.04, 0.72, 0.27, 1), emission_strength=0.68)
FACILITY_VIOLET = pbr_material("FACILITY_VIOLET", (0.18, 0.07, 0.38, 1), roughness=0.24, emission=(0.48, 0.16, 0.9, 1), emission_strength=0.66)
FACILITY_AMBER = pbr_material("FACILITY_AMBER", (0.36, 0.16, 0.02, 1), roughness=0.24, emission=(0.95, 0.42, 0.03, 1), emission_strength=0.72)

add_environment()
add_building("A1", (-12.0, 6.5), (8.0, 5.6, 7.7), NEON_GREEN)
add_building("B2", (3.0, -5.2), (9.0, 6.0, 5.35), NEON_AMBER)
add_building("C3", (12.5, 6.5), (8.0, 5.6, 8.3), NEON_CYAN)
add_building("D4", (15.5, -6.5), (7.8, 5.0, 4.0), NEON_GREEN)
add_building("E5", (-16.0, -9.6), (7.2, 4.8, 3.8), NEON_VIOLET)
add_storage_station()
add_charging_station()
add_substation()
add_lighting()
setup_preview_camera()
export_scene()
