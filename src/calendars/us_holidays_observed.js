function rule(context) {
    const date = context.date;
    const result = [];

    const isRawHoliday = (d) => context.runSnippet("us_holidays", "us_holidays_raw", { date: [d] })[0];

    date.forEach((element) => {
        const day = element.getDay(); // 0 = Sunday .. 6 = Saturday
        let observed = false;

        if (day !== 0 && day !== 6) {
            // Weekday: observed on the same day it falls on, if it's a holiday at all.
            observed = isRawHoliday(element);
        } else if (day === 6) {
            // Saturday holidays are observed the preceding Friday, not on the Saturday itself.
            observed = false;
        } else {
            // Sunday holidays are observed the following Monday, not on the Sunday itself.
            observed = false;
        }

        if (day === 5) {
            // Friday: also observed if the following Saturday is a raw holiday.
            const saturday = new Date(element);
            saturday.setDate(saturday.getDate() + 1);
            observed = observed || isRawHoliday(saturday);
        } else if (day === 1) {
            // Monday: also observed if the preceding Sunday is a raw holiday.
            const sunday = new Date(element);
            sunday.setDate(sunday.getDate() - 1);
            observed = observed || isRawHoliday(sunday);
        }

        result.push(observed);
    });
    return result;
}
return rule(context);
