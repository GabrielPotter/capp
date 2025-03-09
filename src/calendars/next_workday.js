function rule(context) {
    const date = context.date;
    for (let i = 0; i < 7; i++) {
        date.setDate(date.getDate() + 1);
        if (context.runSnippet("tc1", "workdays", { date: date })) {
            return date;
        }
    }
    return null;
}
return rule(context);
