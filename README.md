# Reef Watch

ReefWatch is for anyone who cares about the conservation of coral reefs around the world: divers, hobby fishers, boat crews and "sea shepherds", marine hobbyists, and the marine scientists working to stop coral bleaching.

## What it does

A low-cost device records the reef and keeps only the snapshots that matter: corals whose condition doesn't match what the water temperature predicts.

1. **Survivors.** A healthy, colorful coral while the corals around it in the same water are pale, bleaching or dying, and satellite heat stress is high.
2. **Unexplained damage.** A coral that is bleaching or dying even though the heat data says it should be healthy and thriving. The damage is probably caused by something other than heat, such as pollution, runoff or disease.

Each snapshot is sent to Gemini, which describes what it sees: the kind of coral, its health and how pale it is. ReefWatch then compares every coral with its neighbors and with NOAA heat-stress data for the same place and date to decide which of the two findings it is, if either.

## Why it matters

We want to learn which kinds of coral stay alive longer in heat that would otherwise cause bleaching. Those survivors, and the heat-resistant algae living inside them, are worth studying further; they may help other corals adapt to warmer seas. This data is interesting for marine hobbyists and can be critical for marine scientists looking for ways to stop coral bleaching.

## Notes for contributors

- The two findings above are the product. Everything else supports finding them, so the website should show survivors and unexplained damage first.
- Comparing coral species is the goal. Keep the coral type accurate and consistent, and group or filter by it wherever possible.
- Findings are leads, not proof. Say "candidate" and "may be", never "proven heat-resistant"; scientists confirm with follow-up tests.
- Label test and simulated data honestly.
- The audience is mixed: plain language for hobbyists, real units (°C, meters, Degree Heating Weeks) and exportable data for scientists.
- Technical details (architecture, database, device, how to run it) are in `CLAUDE.md`.
