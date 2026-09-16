function rule(context) {
    const date = context.date;
    const result = [];

    function nthWeekdayOfMonth(year, month, weekday, n) {
        // month: 0-11, weekday: 0=Sun..6=Sat, n: 1..5 for nth occurrence, -1 for last occurrence
        if (n > 0) {
            const first = new Date(year, month, 1);
            const offset = (weekday - first.getDay() + 7) % 7;
            const day = 1 + offset + (n - 1) * 7;
            return new Date(year, month, day);
        }
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const offset = (lastDayOfMonth.getDay() - weekday + 7) % 7;
        return new Date(year, month, lastDayOfMonth.getDate() - offset);
    }

    function isSameDate(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    date.forEach((element) => {
        const year = element.getFullYear();
        const holidays = [
            new Date(year, 0, 1), // New Year's Day
            nthWeekdayOfMonth(year, 0, 1, 3), // Martin Luther King Jr. Day: 3rd Monday of January
            nthWeekdayOfMonth(year, 1, 1, 3), // Presidents Day: 3rd Monday of February
            nthWeekdayOfMonth(year, 4, 1, -1), // Memorial Day: last Monday of May
            new Date(year, 6, 4), // Independence Day
            nthWeekdayOfMonth(year, 8, 1, 1), // Labor Day: 1st Monday of September
            nthWeekdayOfMonth(year, 10, 4, 4), // Thanksgiving: 4th Thursday of November
            new Date(year, 11, 25), // Christmas Day
        ];
        result.push(holidays.some((h) => isSameDate(h, element)));
    });
    return result;
}
return rule(context);
