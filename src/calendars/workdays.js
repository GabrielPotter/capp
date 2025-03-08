function rule(context) {
  const date = context.date;
  // 0 = vasárnap, 1..5 = hétfő..péntek, 6 = szombat
  const day = date.getDay();
  return day >= 1 && day <= 5;
}
return rule(context);
