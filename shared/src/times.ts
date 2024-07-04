export function mondayStart(time = new Date()) {
  const ret = new Date(time);
  ret.setDate(time.getDate() - (time.getDay() + 6) % 7);
  ret.setHours(0, 0, 0, 0);
  return ret;
}

export function sundayEnd(time = new Date()) {
  const ret = new Date(time);
  ret.setDate(time.getDate() - (time.getDay() + 6) % 7 + 7);
  ret.setHours(0, 0, 0, 0);
  return ret;
}
