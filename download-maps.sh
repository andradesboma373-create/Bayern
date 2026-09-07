#!/bin/bash
REPO="https://raw.githubusercontent.com/realc0mpl3x/csgo_images/master"

maps=("mirage" "inferno" "dust2" "nuke" "ancient" "anubis" "cache")
for m in "${maps[@]}"; do
  wget -qO public/maps/$m.jpg $REPO/de_$m.jpg
done

# We also have others like breeze, dune, province, rust, sakura, sandstone.
# Since these aren't standard CSGO maps from that repo, I will just generate beautiful placeholder jpegs using Imagemagick.
