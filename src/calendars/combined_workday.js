function rule(context) {
    const date = context.date;
    const result = [];
    date.forEach((element) => {
        const isWeekday = context.runSnippet("tc1", "tc1_weekdays", { date: [element] })[0];
        const isTc1Holiday = context.runSnippet("tc1", "tc1_holidays", { date: [element] })[0];
        const isUsHoliday = context.runSnippet("us_holidays", "us_holidays_observed", { date: [element] })[0];
        result.push(isWeekday && !isTc1Holiday && !isUsHoliday);
    });
    return result;
}
return rule(context);
