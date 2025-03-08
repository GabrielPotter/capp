function rule(context) {
    // Példa: a `hungarian_workdays` snippet meghívja a "munkanap" és a "hungarian_holidays" snippetet is,
    // ugyanezen naptáron belül. 
    // Ehhez a context.runSnippet("Hungary", "munkanap", ...) és runSnippet("Hungary", "hungarian_holidays", ...) 
    // hívásokat használjuk:
  
    const isMunkanap = context.runSnippet("Hungary", "munkanap", { date: context.date });
    const isHoliday = context.runSnippet("Hungary", "hungarian_holidays", { date: context.date });
    return isMunkanap && !isHoliday;
  }
  return rule(context);
  