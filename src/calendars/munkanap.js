function rule(context) {
  const date = context.date;
  console.log("date", date);
  try {
    // 0 = vasárnap, 1..5 = hétfő..péntek, 6 = szombat
    const day = date.getDay();
    return day >= 1 && day <= 5;
  } catch (e) {
    return e.message;
  }
}
return rule(context);
