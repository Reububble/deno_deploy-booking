document.body.replaceChildren(
  <div id="menu">
    Booking
  </div>,
  <div id="calendar">
    <div id="days">
      <div id="days_left"></div>
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
      <div id="days_right"></div>
    </div>
    <div id="display">
      <div id="display_left">{...new Array(24).fill(undefined).map((_, i) => <div>{i === 0 ? `${i + 12} AM` : i < 13 ? `${i} AM` : `${i - 12} PM`}</div>)}</div>
      <div id="display_mon"></div>
      <div id="display_tue">
        <div style={{ background: "purple", gridRow: "121 / span 24" }}>
          booking
        </div>
      </div>
      <div id="display_wed"></div>
      <div id="display_thu"></div>
      <div id="display_fri"></div>
      <div id="display_sat"></div>
      <div id="display_sun"></div>
      <div id="display_right"></div>
    </div>
  </div>,
  <div id="sidebar"></div>,
);
