function rule(context) {
    const date = context.date;
    const result = [];
    date.forEach((element) => {
        const candidate = new Date(element);
        for (let i = 0; i < 14; i++) {
            candidate.setDate(candidate.getDate() + 1);
            if (context.runSnippet("combined", "combined_workday", { date: [candidate] })[0]) {
                result.push(new Date(candidate));
                break;
            }
        }
    });
    return result;
}
return rule(context);
