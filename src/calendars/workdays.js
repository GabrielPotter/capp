function rule(context) {
    const date = context.date;
    const result = [];
    date.forEach(element => {
        const day = element.getDay();
        result.push((day >= 1 && day <= 5));
    });
    // 0 = vasárnap, 1..5 = hétfő..péntek, 6 = szombat
    //const day = date.getDay();
    //return day >= 1 && day <= 5;
    return result;
}
return rule(context);
