import folium
import pandas as pd
import streamlit as st
from psycopg2.extras import RealDictCursor
from streamlit_folium import st_folium

from database import connect

# verdict -> (label shown on the website, pin color)
LABELS = {
    "resistant_candidate": ("Tough coral: nursery candidate", "green"),
    "non_heat_stress": ("Something besides heat is wrong", "red"),
    "regular": ("As expected", "gray"),
    "dead_or_algae": ("Dead or algae-covered", "black"),
    "needs_more_data": ("Needs more data", "lightgray"),
    "not_coral": ("No coral in view", "lightgray"),
}


def load_snapshots():
    con = connect()
    cur = con.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT id, taken_at, device_id, lat, lon, coral_type, health, paleness,
               reason, dhw, neighbor_count, neighbor_median, verdict, verdict_reason
        FROM snapshots
        WHERE status = 'analyzed'
        ORDER BY taken_at
    """)
    rows = cur.fetchall()
    con.close()
    return pd.DataFrame(rows)


def load_photo(snapshot_id):
    con = connect()
    cur = con.cursor()
    cur.execute("SELECT image_data FROM snapshots WHERE id = %s", (snapshot_id,))
    row = cur.fetchone()
    con.close()
    if row and row[0]:
        return bytes(row[0])
    return None


def load_daily_trend():
    con = connect()
    cur = con.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT time_bucket('1 day', taken_at) AS day,
               AVG(paleness) AS avg_paleness,
               AVG(dhw) AS avg_heat
        FROM snapshots
        WHERE status = 'analyzed'
        GROUP BY day
        ORDER BY day
    """)
    rows = cur.fetchall()
    con.close()
    return pd.DataFrame(rows)


# ---------------- the page ----------------

st.set_page_config(page_title="ReefWatch", layout="wide")
st.title("ReefWatch")
st.subheader("Same water, different outcome.")
st.caption("Every map shows where the heat is. Ours shows where corals are beating it, "
           "and where something else is hurting them.")

if st.button("Refresh"):
    st.rerun()

df = load_snapshots()

if df.empty:
    st.info("No analyzed snapshots yet. Run worker.py and analyze.py first.")
    st.stop()

# --- the four numbers across the top ---
col1, col2, col3, col4 = st.columns(4)
col1.metric("Corals scanned", len(df))
col2.metric("Tough corals found", int((df["verdict"] == "resistant_candidate").sum()))
col3.metric("Something besides heat", int((df["verdict"] == "non_heat_stress").sum()))
col4.metric("As expected", int((df["verdict"] == "regular").sum()))

left, right = st.columns([3, 2])

# --- the map ---
with left:
    reef_map = folium.Map(location=[df["lat"].mean(), df["lon"].mean()], zoom_start=9)
    for _, row in df.iterrows():
        label, color = LABELS.get(row["verdict"], ("Unknown", "lightgray"))
        folium.Marker(
            location=[row["lat"], row["lon"]],
            tooltip=f"#{row['id']}: {label}",
            icon=folium.Icon(color=color),
        ).add_to(reef_map)
    map_state = st_folium(reef_map, height=500, use_container_width=True)

# --- details for the pin you clicked ---
with right:
    selected_id = None
    clicked = map_state.get("last_object_clicked_tooltip") if map_state else None
    if clicked:
        selected_id = int(clicked.split(":")[0].replace("#", ""))
    else:
        flagged = df[df["verdict"] == "resistant_candidate"]
        selected_id = int(flagged["id"].iloc[0]) if not flagged.empty else int(df["id"].iloc[0])

    coral = df[df["id"] == selected_id].iloc[0]
    label, color = LABELS.get(coral["verdict"], ("Unknown", "lightgray"))

    st.markdown(f"### Snapshot #{selected_id}: {label}")
    photo = load_photo(selected_id)
    if photo:
        st.image(photo, width="stretch")
    st.write(f"**Why:** {coral['verdict_reason']}")
    st.write(f"**What the AI sees:** {coral['coral_type']}, {coral['health']} "
             f"(paleness {coral['paleness']}/6). {coral['reason']}")
    st.write(f"**Heat stress:** {coral['dhw']} Degree Heating Weeks (NOAA)")
    st.write(f"**Neighbors compared:** {coral['neighbor_count']}")
    st.write(f"**Photographed:** {coral['taken_at']} by {coral['device_id']}")

# --- Tiger Data time-series chart ---
st.markdown("### Reef condition over time")
st.caption("Daily averages computed by Tiger Data's time_bucket() on our hypertable.")
trend = load_daily_trend()
if not trend.empty:
    trend["day"] = pd.to_datetime(trend["day"])
    st.line_chart(trend.set_index("day")[["avg_paleness", "avg_heat"]])

# --- full table ---
with st.expander("All snapshots"):
    st.dataframe(df[["id", "taken_at", "coral_type", "health", "paleness",
                     "dhw", "neighbor_count", "verdict"]], width="stretch")
