import { mondayStart } from "shared/times.ts";

async function getBookings() {
  try {
    const ret = await fetch("/api/bookings");
    if (ret.status !== 200) {
      throw new Error("not ok");
    }
    return ret;
  } catch {
    await fetch("/api/user", {
      method: "POST",
      body: JSON.stringify({
        name: prompt("name"),
        password: prompt("password"),
      }),
      credentials: "same-origin",
    });
    return await fetch("/api/bookings");
  }
}

const bookings = await (await getBookings()).json() as {
  name: string;
  start: number;
  end: number;
}[];

document.body.replaceChildren(
  <div id="menu">
    Booking
  </div>,
  <div id="calendar">
    <div id="days">
      <div id="days_left">
        <button>Week</button>
      </div>
      <div id="days_mon">
        <div>Monday</div>
      </div>
      <div id="days_tue">
        <div>Tuesday</div>
      </div>
      <div id="days_wed">
        <div>Wednesday</div>
      </div>
      <div id="days_thu">
        <div>Thursday</div>
      </div>
      <div id="days_fri">
        <div>Friday</div>
      </div>
      <div id="days_sat">
        <div>Saturday</div>
      </div>
      <div id="days_sun">
        <div>Sunday</div>
      </div>
    </div>
    <div id="display">
      <div id="display_left">{...new Array(24).fill(undefined).map((_, i) => <div>{i === 0 ? `${i + 12} AM` : i < 13 ? `${i} AM` : `${i - 12} PM`}</div>)}</div>
      <div id="display_mon"></div>
      <div id="display_tue"></div>
      <div id="display_wed"></div>
      <div id="display_thu"></div>
      <div id="display_fri"></div>
      <div id="display_sat"></div>
      <div id="display_sun"></div>
    </div>
  </div>,
  <div id="sidebar">
    <form>
      <label>
        Start:
        <div className="datetime">
          <input type="date"></input>
          <input type="time"></input>
        </div>
      </label>
      <label>
        End:
        <div className="datetime">
          <input type="date"></input>
          <input type="time"></input>
        </div>
      </label>
    </form>
  </div>,
);

const now = new Date();
const monStart = mondayStart(now).getTime();

for (const booking of bookings) {
  // I have to display this booking
  for (let day = 0; day < 7; ++day) {
    const dayStart = monStart + day * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    if (booking.end < dayStart) {
      continue;
    }
    if (booking.start > dayEnd) {
      continue;
    }

    const top = Math.max(0, (booking.start - dayStart) / (24 * 60 * 60 * 1000));
    const bottom = Math.min(1, (booking.end - dayStart) / (24 * 60 * 60 * 1000));

    const booked = document.createElement("div");
    booked.style.background = "purple";
    booked.style.position = "relative";
    booked.style.top = `${top * 100}%`;
    booked.style.height = `${(bottom - top) * 100}%`;
    booked.textContent = `${booking.name}\n${new Date(booking.start).toLocaleTimeString()} - ${new Date(booking.end).toLocaleTimeString()}`;

    const column = document.body.querySelector(
      ["#display_mon", "#display_tue", "#display_wed", "#display_thu", "#display_fri", "#display_sat", "#display_sun"][day],
    )!;
    column.appendChild(booked);
  }
}
