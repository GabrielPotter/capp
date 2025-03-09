function rule(context) {
    const isWorkday = context.runSnippet("tc1", "workdays", { date: context.date });
    const isHoliday = context.runSnippet("tc1", "tc1_holidays", { date: context.date });
    return isWorkday && !isHoliday;
}
return rule(context);
