function rule(context) {
    const date = context.date;
    const result = [];
    date.forEach((element) => {
        const mm = String(element.getMonth() + 1).padStart(2, "0");
        const dd = String(element.getDate()).padStart(2, "0");
        const mmdd = mm + "-" + dd;
        const holidays = ["01-01", "03-15", "08-20", "10-23", "11-01", "12-25", "12-26"];
        result.push(holidays.includes(mmdd));
    });
    return result;
}
return rule(context);
