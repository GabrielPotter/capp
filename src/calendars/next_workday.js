function rule(context) {
    const date = context.date;
    const result = [];
    date.forEach((element) => {
        for (let i = 0; i < 7; i++) {
            element.setDate(element.getDate() + 1);
            if (context.runSnippet("tc1", "workdays", { date: [element] })[0]) {
                result.push(element);
                break;
            }
        }
    });
    return result;
}
return rule(context);
