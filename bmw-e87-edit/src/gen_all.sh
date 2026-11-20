#!/bin/bash
# Generates the raw clips (Wan 2.2 I2V, free ZeroGPU space). Skips clips that already exist.
cd "$(dirname "$0")/.."
gen() { [ -f raw/$2.mp4 ] && return; echo "== $2"; timeout 600 python3 src/gen_clip.py "$1" raw/$2.mp4 "$3" "$4" 2>&1 | tail -1; }
gen build/start/wide.jpg   01_wide_approach 3.5 "The silver BMW hatchback drives slowly straight toward the camera across the dusty plain with headlights on, the camera slowly dollies backward, warm golden hour sun, dust, cinematic car commercial"
gen build/start/grille.jpg 02_grille_orbit  3.5 "Slow cinematic camera orbit around the BMW kidney grille and roundel badge, golden sunlight glints sweep across the chrome and silver paint, shallow depth of field, car commercial"
gen build/start/head.jpg   03_headlight     3.5 "Slow smooth camera push-in toward the glowing headlight of the silver BMW, light flickers warmly, dust floating in golden hour sunlight, cinematic"
gen build/start/side.jpg   04_side_drive    3.5 "The silver BMW hatchback drives forward to the left across the dusty plain, the camera tracks smoothly alongside it, wheels rolling, dust trail, golden hour backlight, cinematic car commercial"
gen build/start/wheel.jpg  05_wheel_roll    3.5 "The alloy wheel of the silver BMW starts rolling forward, low ground-level tracking shot, dust kicks up, golden hour lens flare, cinematic"
gen build/start/side.jpg   06_orbit_rear    3.5 "The camera orbits smoothly around the parked silver BMW hatchback from the side to the rear, revealing the tailgate and red tail lights, golden hour, cinematic car commercial"
gen build/start/wide.jpg   07_wide_orbit    3.5 "The camera slowly orbits to the right around the parked silver BMW hatchback, headlights on, dusty plain at golden hour, cinematic car commercial"
echo DONE
