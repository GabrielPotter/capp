function rule(context) {
    const date = context.date;
    const days = context.days || 1;
    const result = [];
    date.forEach((element) => {
        const candidate = new Date(element);
        let remaining = days;
        let safety = 0;
        while (remaining > 0 && safety < 366) {
            candidate.setDate(candidate.getDate() + 1);
            if (context.runSnippet("combined", "combined_workday", { date: [candidate] })[0]) {
                remaining--;
            }
            safety++;
        }
        result.push(new Date(candidate));
    });
    return result;
}
return rule(context);
