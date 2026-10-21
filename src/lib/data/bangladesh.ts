export type Division = { id: string; name: string; bn: string };
export type District = { id: string; divisionId: string; name: string; bn: string };

export const divisions: Division[] = [
  {
    "id": "1",
    "name": "Barishal",
    "bn": "বরিশাল"
  },
  {
    "id": "2",
    "name": "Chattogram",
    "bn": "চট্টগ্রাম"
  },
  {
    "id": "3",
    "name": "Dhaka",
    "bn": "ঢাকা"
  },
  {
    "id": "4",
    "name": "Khulna",
    "bn": "খুলনা"
  },
  {
    "id": "5",
    "name": "Rajshahi",
    "bn": "রাজশাহী"
  },
  {
    "id": "6",
    "name": "Rangpur",
    "bn": "রংপুর"
  },
  {
    "id": "7",
    "name": "Sylhet",
    "bn": "সিলেট"
  },
  {
    "id": "8",
    "name": "Mymensingh",
    "bn": "ময়মনসিংহ"
  }
];

export const districts: District[] = [
  {
    "id": "1",
    "divisionId": "3",
    "name": "Dhaka",
    "bn": "ঢাকা"
  },
  {
    "id": "2",
    "divisionId": "3",
    "name": "Faridpur",
    "bn": "ফরিদপুর"
  },
  {
    "id": "3",
    "divisionId": "3",
    "name": "Gazipur",
    "bn": "গাজীপুর"
  },
  {
    "id": "4",
    "divisionId": "3",
    "name": "Gopalganj",
    "bn": "গোপালগঞ্জ"
  },
  {
    "id": "5",
    "divisionId": "8",
    "name": "Jamalpur",
    "bn": "জামালপুর"
  },
  {
    "id": "6",
    "divisionId": "3",
    "name": "Kishoreganj",
    "bn": "কিশোরগঞ্জ"
  },
  {
    "id": "7",
    "divisionId": "3",
    "name": "Madaripur",
    "bn": "মাদারীপুর"
  },
  {
    "id": "8",
    "divisionId": "3",
    "name": "Manikganj",
    "bn": "মানিকগঞ্জ"
  },
  {
    "id": "9",
    "divisionId": "3",
    "name": "Munshiganj",
    "bn": "মুন্সিগঞ্জ"
  },
  {
    "id": "10",
    "divisionId": "8",
    "name": "Mymensingh",
    "bn": "ময়মনসিংহ"
  },
  {
    "id": "11",
    "divisionId": "3",
    "name": "Narayanganj",
    "bn": "নারায়াণগঞ্জ"
  },
  {
    "id": "12",
    "divisionId": "3",
    "name": "Narsingdi",
    "bn": "নরসিংদী"
  },
  {
    "id": "13",
    "divisionId": "8",
    "name": "Netrokona",
    "bn": "নেত্রকোণা"
  },
  {
    "id": "14",
    "divisionId": "3",
    "name": "Rajbari",
    "bn": "রাজবাড়ি"
  },
  {
    "id": "15",
    "divisionId": "3",
    "name": "Shariatpur",
    "bn": "শরীয়তপুর"
  },
  {
    "id": "16",
    "divisionId": "8",
    "name": "Sherpur",
    "bn": "শেরপুর"
  },
  {
    "id": "17",
    "divisionId": "3",
    "name": "Tangail",
    "bn": "টাঙ্গাইল"
  },
  {
    "id": "18",
    "divisionId": "5",
    "name": "Bogura",
    "bn": "বগুড়া"
  },
  {
    "id": "19",
    "divisionId": "5",
    "name": "Joypurhat",
    "bn": "জয়পুরহাট"
  },
  {
    "id": "20",
    "divisionId": "5",
    "name": "Naogaon",
    "bn": "নওগাঁ"
  },
  {
    "id": "21",
    "divisionId": "5",
    "name": "Natore",
    "bn": "নাটোর"
  },
  {
    "id": "22",
    "divisionId": "5",
    "name": "Nawabganj",
    "bn": "নবাবগঞ্জ"
  },
  {
    "id": "23",
    "divisionId": "5",
    "name": "Pabna",
    "bn": "পাবনা"
  },
  {
    "id": "24",
    "divisionId": "5",
    "name": "Rajshahi",
    "bn": "রাজশাহী"
  },
  {
    "id": "25",
    "divisionId": "5",
    "name": "Sirajgonj",
    "bn": "সিরাজগঞ্জ"
  },
  {
    "id": "26",
    "divisionId": "6",
    "name": "Dinajpur",
    "bn": "দিনাজপুর"
  },
  {
    "id": "27",
    "divisionId": "6",
    "name": "Gaibandha",
    "bn": "গাইবান্ধা"
  },
  {
    "id": "28",
    "divisionId": "6",
    "name": "Kurigram",
    "bn": "কুড়িগ্রাম"
  },
  {
    "id": "29",
    "divisionId": "6",
    "name": "Lalmonirhat",
    "bn": "লালমনিরহাট"
  },
  {
    "id": "30",
    "divisionId": "6",
    "name": "Nilphamari",
    "bn": "নীলফামারী"
  },
  {
    "id": "31",
    "divisionId": "6",
    "name": "Panchagarh",
    "bn": "পঞ্চগড়"
  },
  {
    "id": "32",
    "divisionId": "6",
    "name": "Rangpur",
    "bn": "রংপুর"
  },
  {
    "id": "33",
    "divisionId": "6",
    "name": "Thakurgaon",
    "bn": "ঠাকুরগাঁও"
  },
  {
    "id": "34",
    "divisionId": "1",
    "name": "Barguna",
    "bn": "বরগুনা"
  },
  {
    "id": "35",
    "divisionId": "1",
    "name": "Barishal",
    "bn": "বরিশাল"
  },
  {
    "id": "36",
    "divisionId": "1",
    "name": "Bhola",
    "bn": "ভোলা"
  },
  {
    "id": "37",
    "divisionId": "1",
    "name": "Jhalokati",
    "bn": "ঝালকাঠি"
  },
  {
    "id": "38",
    "divisionId": "1",
    "name": "Patuakhali",
    "bn": "পটুয়াখালী"
  },
  {
    "id": "39",
    "divisionId": "1",
    "name": "Pirojpur",
    "bn": "পিরোজপুর"
  },
  {
    "id": "40",
    "divisionId": "2",
    "name": "Bandarban",
    "bn": "বান্দরবান"
  },
  {
    "id": "41",
    "divisionId": "2",
    "name": "Brahmanbaria",
    "bn": "ব্রাহ্মণবাড়িয়া"
  },
  {
    "id": "42",
    "divisionId": "2",
    "name": "Chandpur",
    "bn": "চাঁদপুর"
  },
  {
    "id": "43",
    "divisionId": "2",
    "name": "Chattogram",
    "bn": "চট্টগ্রাম"
  },
  {
    "id": "44",
    "divisionId": "2",
    "name": "Cumilla",
    "bn": "কুমিল্লা"
  },
  {
    "id": "45",
    "divisionId": "2",
    "name": "Cox's Bazar",
    "bn": "কক্স বাজার"
  },
  {
    "id": "46",
    "divisionId": "2",
    "name": "Feni",
    "bn": "ফেনী"
  },
  {
    "id": "47",
    "divisionId": "2",
    "name": "Khagrachari",
    "bn": "খাগড়াছড়ি"
  },
  {
    "id": "48",
    "divisionId": "2",
    "name": "Lakshmipur",
    "bn": "লক্ষ্মীপুর"
  },
  {
    "id": "49",
    "divisionId": "2",
    "name": "Noakhali",
    "bn": "নোয়াখালী"
  },
  {
    "id": "50",
    "divisionId": "2",
    "name": "Rangamati",
    "bn": "রাঙ্গামাটি"
  },
  {
    "id": "51",
    "divisionId": "7",
    "name": "Habiganj",
    "bn": "হবিগঞ্জ"
  },
  {
    "id": "52",
    "divisionId": "7",
    "name": "Maulvibazar",
    "bn": "মৌলভীবাজার"
  },
  {
    "id": "53",
    "divisionId": "7",
    "name": "Sunamganj",
    "bn": "সুনামগঞ্জ"
  },
  {
    "id": "54",
    "divisionId": "7",
    "name": "Sylhet",
    "bn": "সিলেট"
  },
  {
    "id": "55",
    "divisionId": "4",
    "name": "Bagerhat",
    "bn": "বাগেরহাট"
  },
  {
    "id": "56",
    "divisionId": "4",
    "name": "Chuadanga",
    "bn": "চুয়াডাঙ্গা"
  },
  {
    "id": "57",
    "divisionId": "4",
    "name": "Jashore",
    "bn": "যশোর"
  },
  {
    "id": "58",
    "divisionId": "4",
    "name": "Jhenaidah",
    "bn": "ঝিনাইদহ"
  },
  {
    "id": "59",
    "divisionId": "4",
    "name": "Khulna",
    "bn": "খুলনা"
  },
  {
    "id": "60",
    "divisionId": "4",
    "name": "Kushtia",
    "bn": "কুষ্টিয়া"
  },
  {
    "id": "61",
    "divisionId": "4",
    "name": "Magura",
    "bn": "মাগুরা"
  },
  {
    "id": "62",
    "divisionId": "4",
    "name": "Meherpur",
    "bn": "মেহেরপুর"
  },
  {
    "id": "63",
    "divisionId": "4",
    "name": "Narail",
    "bn": "নড়াইল"
  },
  {
    "id": "64",
    "divisionId": "4",
    "name": "Satkhira",
    "bn": "সাতক্ষীরা"
  }
];

export function getDistrictsByDivision(divisionId: string): District[] {
  return districts.filter(d => d.divisionId === divisionId);
}
