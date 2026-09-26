from database import add_snapshot

# Reef 1: Looe Key, August 2023, during the heatwave (high heat).
# Three bleached corals and one healthy one, a few meters apart.
add_snapshot("coral.jpeg",   24.54700, -81.40400, "2023-08-20 10:00:00+00")
add_snapshot("coral.jpeg",   24.54705, -81.40405, "2023-08-20 10:00:20+00")
add_snapshot("coral.jpeg",   24.54710, -81.40395, "2023-08-20 10:00:40+00")
add_snapshot("healthy.jpeg", 24.54708, -81.40410, "2023-08-20 10:01:00+00")

# Reef 2: Molasses Reef, June 2023, before the heatwave (low heat).
# Pale corals here can't be blamed on heat.
add_snapshot("coral.jpeg",   25.01000, -80.37600, "2023-06-01 10:00:00+00")
add_snapshot("coral.jpeg",   25.01005, -80.37605, "2023-06-01 10:00:20+00")
add_snapshot("coral.jpeg",   25.01010, -80.37595, "2023-06-01 10:00:40+00")

print("Added 7 demo snapshots.")