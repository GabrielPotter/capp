function rule(context) {
    const date = context.date;
    const result = [];
    date.forEach((element) => {
        const isWorkday = context.runSnippet("tc1", "workdays", { date: [element] })[0];
        const isHoliday = context.runSnippet("tc1", "tc1_holidays", { date: [element] })[0];
        result.push( isWorkday && (!isHoliday));
    });
    return result;
}
return rule(context);
