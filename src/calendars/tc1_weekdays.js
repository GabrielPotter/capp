function rule(context) {
    const date = context.date;
    const result = [];
    date.forEach(element => {
        const day = element.getDay();
        result.push((day >= 1 && day <= 5));
    });
    return result;
}
return rule(context);
