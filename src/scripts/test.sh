#! /bin/bash
if [ $# -eq 0 ]; then
    echo "missing url"
    exit 1
fi
url=$1

echo -e "from url: $url \n"
echo -e "\n🔹 Fetching all calendars..."
curl -X GET $url/calendars
echo -e "\n--------------------------------------"

echo -e "\n🔹 Fetching the 'tc1' calendar..."
curl -X GET $url/calendars/tc1
echo -e "\n--------------------------------------"

echo -e "\n🔹 Checking if '2025-08-14' is a  workday..."
curl -X GET "$url/calendars/tc1/evaluate?rule=tc1_weekdays&date=2025-08-14"
echo -e "\n--------------------------------------"

echo -e "\n🔹 Checking if '2025-08-14' and '2025-08-20' is a 'tc1' workday..."
curl -X GET "$url/calendars/tc1/evaluate?rule=tc1_workdays&date=2025-08-14&date=2025-08-20"
echo -e "\n--------------------------------------"

echo -e "\n🔹 Checking if '2025-08-14' and '2025-08-20' is a 'tc1' holiday..."
curl -X GET "$url/calendars/tc1/evaluate?rule=tc1_holidays&date=2025-08-14&date=2025-08-20"
echo -e "\n--------------------------------------"

echo -e "\n🔹 Get the next workday after '2025-03-09' ..."
curl -X GET "$url/calendars/tc1/evaluate?rule=tc1_next_workday&date=2025-03-09"
echo -e "\n--------------------------------------"

echo -e "\n🔹 Get the next workdays after '2025-03-08' and '2025-03-10' ..."
curl -X GET "$url/calendars/tc1/evaluate?rule=tc1_next_workday&date=2025-03-08&date=2025-03-10"
echo -e "\n--------------------------------------"

echo -e "\n🔹 Checking if 'invalid' is a  workday..."
curl -X GET "$url/calendars/tc1/evaluate?rule=tc1_weekdays&date=invalid"
echo -e "\n--------------------------------------"

echo -e "\n🔹 Use invalid rule ..."
curl -X GET "$url/calendars/tc1/evaluate?rule=workdaysX&date=invalid"
echo -e "\n--------------------------------------"

echo -e "\n🔹 Use invalid calendar ..."
curl -X GET "$url/calendars/tc1X/evaluate?rule=workdaysX&date=invalid"
echo -e "\n--------------------------------------"