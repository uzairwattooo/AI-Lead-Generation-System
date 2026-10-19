export const REGIONS_BY_COUNTRY: Record<string, readonly string[]> = {
  "United States": [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "District of Columbia",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ],
  Canada: [
    "Alberta",
    "British Columbia",
    "Manitoba",
    "New Brunswick",
    "Newfoundland and Labrador",
    "Northwest Territories",
    "Nova Scotia",
    "Nunavut",
    "Ontario",
    "Prince Edward Island",
    "Quebec",
    "Saskatchewan",
    "Yukon",
  ],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Germany: [
    "Baden-Wurttemberg",
    "Bavaria",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hesse",
    "Lower Saxony",
    "North Rhine-Westphalia",
    "Rhineland-Palatinate",
    "Saarland",
    "Saxony",
    "Saxony-Anhalt",
    "Schleswig-Holstein",
    "Thuringia",
  ],
  Australia: [
    "Australian Capital Territory",
    "New South Wales",
    "Northern Territory",
    "Queensland",
    "South Australia",
    "Tasmania",
    "Victoria",
    "Western Australia",
  ],
  "United Arab Emirates": [
    "Abu Dhabi",
    "Ajman",
    "Dubai",
    "Fujairah",
    "Ras Al Khaimah",
    "Sharjah",
    "Umm Al Quwain",
  ],
  Pakistan: [
    "Punjab",
    "Sindh",
    "Khyber Pakhtunkhwa",
    "Balochistan",
    "Islamabad Capital Territory",
    "Gilgit-Baltistan",
    "Azad Jammu and Kashmir",
  ],
  India: [
    "Delhi",
    "Gujarat",
    "Karnataka",
    "Maharashtra",
    "Rajasthan",
    "Tamil Nadu",
    "Telangana",
    "Uttar Pradesh",
    "West Bengal",
  ],
};

export const CITIES_BY_COUNTRY_REGION: Record<string, Record<string, readonly string[]>> = {
  "United States": {
    Alabama: ["Birmingham", "Huntsville", "Mobile", "Montgomery"],
    Alaska: ["Anchorage", "Fairbanks", "Juneau"],
    Arizona: ["Phoenix", "Tucson", "Mesa", "Scottsdale"],
    Arkansas: ["Little Rock", "Fayetteville", "Fort Smith"],
    California: ["Los Angeles", "San Diego", "San Francisco", "San Jose", "Sacramento"],
    Colorado: ["Denver", "Colorado Springs", "Aurora", "Fort Collins"],
    Connecticut: ["Bridgeport", "Hartford", "New Haven", "Stamford"],
    Delaware: ["Wilmington", "Dover", "Newark"],
    "District of Columbia": ["Washington"],
    Florida: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"],
    Georgia: ["Atlanta", "Savannah", "Augusta", "Columbus"],
    Hawaii: ["Honolulu", "Hilo", "Kailua"],
    Idaho: ["Boise", "Meridian", "Idaho Falls"],
    Illinois: ["Chicago", "Aurora", "Naperville", "Springfield"],
    Indiana: ["Indianapolis", "Fort Wayne", "Evansville"],
    Iowa: ["Des Moines", "Cedar Rapids", "Davenport"],
    Kansas: ["Wichita", "Overland Park", "Kansas City", "Topeka"],
    Kentucky: ["Louisville", "Lexington", "Bowling Green"],
    Louisiana: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette"],
    Maine: ["Portland", "Lewiston", "Bangor"],
    Maryland: ["Baltimore", "Frederick", "Rockville", "Annapolis"],
    Massachusetts: ["Boston", "Worcester", "Springfield", "Cambridge"],
    Michigan: ["Detroit", "Grand Rapids", "Ann Arbor", "Lansing"],
    Minnesota: ["Minneapolis", "Saint Paul", "Rochester", "Duluth"],
    Mississippi: ["Jackson", "Gulfport", "Southaven"],
    Missouri: ["Kansas City", "Saint Louis", "Springfield", "Columbia"],
    Montana: ["Billings", "Missoula", "Bozeman"],
    Nebraska: ["Omaha", "Lincoln", "Bellevue"],
    Nevada: ["Las Vegas", "Henderson", "Reno"],
    "New Hampshire": ["Manchester", "Nashua", "Concord"],
    "New Jersey": ["Newark", "Jersey City", "Paterson", "Trenton"],
    "New Mexico": ["Albuquerque", "Las Cruces", "Santa Fe"],
    "New York": ["New York City", "Buffalo", "Rochester", "Albany"],
    "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham"],
    "North Dakota": ["Fargo", "Bismarck", "Grand Forks"],
    Ohio: ["Columbus", "Cleveland", "Cincinnati", "Toledo"],
    Oklahoma: ["Oklahoma City", "Tulsa", "Norman"],
    Oregon: ["Portland", "Eugene", "Salem", "Bend"],
    Pennsylvania: ["Philadelphia", "Pittsburgh", "Allentown", "Harrisburg"],
    "Rhode Island": ["Providence", "Warwick", "Cranston"],
    "South Carolina": ["Charleston", "Columbia", "Greenville"],
    "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen"],
    Tennessee: ["Nashville", "Memphis", "Knoxville", "Chattanooga"],
    Texas: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
    Utah: ["Salt Lake City", "West Valley City", "Provo"],
    Vermont: ["Burlington", "South Burlington", "Rutland"],
    Virginia: ["Virginia Beach", "Richmond", "Norfolk", "Arlington"],
    Washington: ["Seattle", "Spokane", "Tacoma", "Bellevue"],
    "West Virginia": ["Charleston", "Huntington", "Morgantown"],
    Wisconsin: ["Milwaukee", "Madison", "Green Bay", "Kenosha"],
    Wyoming: ["Cheyenne", "Casper", "Laramie"],
  },
  Pakistan: {
    Punjab: ["Lahore", "Faisalabad", "Rawalpindi", "Gujranwala", "Multan", "Sialkot", "Bahawalpur"],
    Sindh: ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Mirpur Khas"],
    "Khyber Pakhtunkhwa": ["Peshawar", "Abbottabad", "Mardan", "Swat", "Kohat"],
    Balochistan: ["Quetta", "Gwadar", "Turbat", "Khuzdar"],
    "Islamabad Capital Territory": ["Islamabad"],
    "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza"],
    "Azad Jammu and Kashmir": ["Muzaffarabad", "Mirpur", "Kotli"],
  },
  Canada: {
    Alberta: ["Calgary", "Edmonton", "Red Deer"],
    "British Columbia": ["Vancouver", "Victoria", "Surrey", "Burnaby"],
    Manitoba: ["Winnipeg", "Brandon"],
    Ontario: ["Toronto", "Ottawa", "Mississauga", "Hamilton"],
    Quebec: ["Montreal", "Quebec City", "Laval"],
  },
  "United Kingdom": {
    England: ["London", "Birmingham", "Manchester", "Leeds", "Liverpool"],
    Scotland: ["Glasgow", "Edinburgh", "Aberdeen", "Dundee"],
    Wales: ["Cardiff", "Swansea", "Newport"],
    "Northern Ireland": ["Belfast", "Derry", "Lisburn"],
  },
  Australia: {
    "Australian Capital Territory": ["Canberra"],
    "New South Wales": ["Sydney", "Newcastle", "Wollongong"],
    Queensland: ["Brisbane", "Gold Coast", "Cairns"],
    Victoria: ["Melbourne", "Geelong", "Ballarat"],
    "Western Australia": ["Perth", "Fremantle", "Bunbury"],
  },
  "United Arab Emirates": {
    "Abu Dhabi": ["Abu Dhabi", "Al Ain"],
    Dubai: ["Dubai", "Jebel Ali"],
    Sharjah: ["Sharjah", "Khor Fakkan"],
    Ajman: ["Ajman"],
  },
  India: {
    Delhi: ["New Delhi", "Delhi"],
    Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
    Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
    Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
    Rajasthan: ["Jaipur", "Jodhpur", "Udaipur"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
    Telangana: ["Hyderabad", "Warangal"],
    "Uttar Pradesh": ["Lucknow", "Noida", "Kanpur", "Agra"],
    "West Bengal": ["Kolkata", "Howrah", "Siliguri"],
  },
};

// Suggested major cities; other towns remain searchable through the custom location fields.
const ADDITIONAL_LOCATIONS: Record<string, Record<string, readonly string[]>> = {
  "Canada": {
    "New Brunswick": [
      "Fredericton",
      "Moncton",
      "Saint John"
    ],
    "Newfoundland and Labrador": [
      "St. John’s",
      "Corner Brook"
    ],
    "Northwest Territories": [
      "Yellowknife",
      "Hay River"
    ],
    "Nova Scotia": [
      "Halifax",
      "Sydney"
    ],
    "Nunavut": [
      "Iqaluit",
      "Rankin Inlet"
    ],
    "Prince Edward Island": [
      "Charlottetown",
      "Summerside"
    ],
    "Saskatchewan": [
      "Saskatoon",
      "Regina"
    ],
    "Yukon": [
      "Whitehorse",
      "Dawson City"
    ]
  },
  "Germany": {
    "Baden-Wurttemberg": [
      "Stuttgart",
      "Mannheim",
      "Karlsruhe",
      "Freiburg"
    ],
    "Bavaria": [
      "Munich",
      "Nuremberg",
      "Augsburg"
    ],
    "Berlin": [
      "Berlin"
    ],
    "Brandenburg": [
      "Potsdam",
      "Cottbus"
    ],
    "Bremen": [
      "Bremen",
      "Bremerhaven"
    ],
    "Hamburg": [
      "Hamburg"
    ],
    "Hesse": [
      "Frankfurt",
      "Wiesbaden",
      "Kassel"
    ],
    "Lower Saxony": [
      "Hanover",
      "Braunschweig",
      "Oldenburg"
    ],
    "North Rhine-Westphalia": [
      "Cologne",
      "Dusseldorf",
      "Dortmund",
      "Essen",
      "Bonn"
    ],
    "Rhineland-Palatinate": [
      "Mainz",
      "Koblenz",
      "Trier"
    ],
    "Saarland": [
      "Saarbrucken"
    ],
    "Saxony": [
      "Dresden",
      "Leipzig",
      "Chemnitz"
    ],
    "Saxony-Anhalt": [
      "Magdeburg",
      "Halle"
    ],
    "Schleswig-Holstein": [
      "Kiel",
      "Lubeck"
    ],
    "Thuringia": [
      "Erfurt",
      "Jena",
      "Weimar"
    ]
  },
  "Australia": {
    "Northern Territory": [
      "Darwin",
      "Alice Springs"
    ],
    "South Australia": [
      "Adelaide",
      "Mount Gambier"
    ],
    "Tasmania": [
      "Hobart",
      "Launceston"
    ]
  },
  "United Arab Emirates": {
    "Fujairah": [
      "Fujairah",
      "Dibba Al-Fujairah"
    ],
    "Ras Al Khaimah": [
      "Ras Al Khaimah"
    ],
    "Umm Al Quwain": [
      "Umm Al Quwain"
    ]
  },
  "Ireland": {
    "Leinster": [
      "Dublin",
      "Kilkenny",
      "Drogheda"
    ],
    "Munster": [
      "Cork",
      "Limerick",
      "Waterford"
    ],
    "Connacht": [
      "Galway",
      "Sligo"
    ],
    "Ulster": [
      "Letterkenny",
      "Cavan",
      "Monaghan"
    ]
  },
  "Netherlands": {
    "Drenthe": [
      "Assen",
      "Emmen"
    ],
    "Flevoland": [
      "Almere",
      "Lelystad"
    ],
    "Friesland": [
      "Leeuwarden",
      "Drachten"
    ],
    "Gelderland": [
      "Arnhem",
      "Nijmegen"
    ],
    "Groningen": [
      "Groningen"
    ],
    "Limburg": [
      "Maastricht",
      "Venlo"
    ],
    "North Brabant": [
      "Eindhoven",
      "Tilburg",
      "Breda"
    ],
    "North Holland": [
      "Amsterdam",
      "Haarlem"
    ],
    "Overijssel": [
      "Enschede",
      "Zwolle"
    ],
    "South Holland": [
      "Rotterdam",
      "The Hague",
      "Leiden"
    ],
    "Utrecht": [
      "Utrecht",
      "Amersfoort"
    ],
    "Zeeland": [
      "Middelburg",
      "Vlissingen"
    ]
  },
  "France": {
    "Auvergne-Rhone-Alpes": [
      "Lyon",
      "Grenoble"
    ],
    "Bourgogne-Franche-Comte": [
      "Dijon",
      "Besancon"
    ],
    "Brittany": [
      "Rennes",
      "Brest"
    ],
    "Centre-Val de Loire": [
      "Orleans",
      "Tours"
    ],
    "Corsica": [
      "Ajaccio",
      "Bastia"
    ],
    "Grand Est": [
      "Strasbourg",
      "Reims"
    ],
    "Hauts-de-France": [
      "Lille",
      "Amiens"
    ],
    "Ile-de-France": [
      "Paris",
      "Versailles"
    ],
    "Normandy": [
      "Rouen",
      "Caen"
    ],
    "Nouvelle-Aquitaine": [
      "Bordeaux",
      "Limoges"
    ],
    "Occitanie": [
      "Toulouse",
      "Montpellier"
    ],
    "Pays de la Loire": [
      "Nantes",
      "Angers"
    ],
    "Provence-Alpes-Cote d’Azur": [
      "Marseille",
      "Nice"
    ],
    "Guadeloupe": [
      "Basse-Terre",
      "Pointe-a-Pitre"
    ],
    "Martinique": [
      "Fort-de-France"
    ],
    "French Guiana": [
      "Cayenne"
    ],
    "Reunion": [
      "Saint-Denis"
    ],
    "Mayotte": [
      "Mamoudzou"
    ]
  },
  "Spain": {
    "Andalusia": [
      "Seville",
      "Malaga",
      "Granada"
    ],
    "Aragon": [
      "Zaragoza",
      "Huesca"
    ],
    "Asturias": [
      "Oviedo",
      "Gijon"
    ],
    "Balearic Islands": [
      "Palma",
      "Ibiza"
    ],
    "Basque Country": [
      "Bilbao",
      "San Sebastian"
    ],
    "Canary Islands": [
      "Las Palmas",
      "Santa Cruz de Tenerife"
    ],
    "Cantabria": [
      "Santander"
    ],
    "Castile and Leon": [
      "Valladolid",
      "Salamanca"
    ],
    "Castilla-La Mancha": [
      "Toledo",
      "Albacete"
    ],
    "Catalonia": [
      "Barcelona",
      "Girona"
    ],
    "Extremadura": [
      "Badajoz",
      "Caceres"
    ],
    "Galicia": [
      "Vigo",
      "A Coruna"
    ],
    "La Rioja": [
      "Logrono"
    ],
    "Madrid": [
      "Madrid",
      "Alcala de Henares"
    ],
    "Murcia": [
      "Murcia",
      "Cartagena"
    ],
    "Navarre": [
      "Pamplona"
    ],
    "Valencian Community": [
      "Valencia",
      "Alicante"
    ],
    "Ceuta": [
      "Ceuta"
    ],
    "Melilla": [
      "Melilla"
    ]
  },
  "Italy": {
    "Abruzzo": [
      "L’Aquila",
      "Pescara"
    ],
    "Basilicata": [
      "Potenza",
      "Matera"
    ],
    "Calabria": [
      "Catanzaro",
      "Reggio Calabria"
    ],
    "Campania": [
      "Naples",
      "Salerno"
    ],
    "Emilia-Romagna": [
      "Bologna",
      "Parma"
    ],
    "Friuli Venezia Giulia": [
      "Trieste",
      "Udine"
    ],
    "Lazio": [
      "Rome",
      "Latina"
    ],
    "Liguria": [
      "Genoa",
      "La Spezia"
    ],
    "Lombardy": [
      "Milan",
      "Bergamo"
    ],
    "Marche": [
      "Ancona",
      "Pesaro"
    ],
    "Molise": [
      "Campobasso",
      "Isernia"
    ],
    "Piedmont": [
      "Turin",
      "Novara"
    ],
    "Apulia": [
      "Bari",
      "Lecce"
    ],
    "Sardinia": [
      "Cagliari",
      "Sassari"
    ],
    "Sicily": [
      "Palermo",
      "Catania"
    ],
    "Trentino-Alto Adige": [
      "Trento",
      "Bolzano"
    ],
    "Tuscany": [
      "Florence",
      "Pisa"
    ],
    "Umbria": [
      "Perugia",
      "Terni"
    ],
    "Aosta Valley": [
      "Aosta"
    ],
    "Veneto": [
      "Venice",
      "Verona",
      "Padua"
    ]
  },
  "Sweden": {
    "Stockholm": [
      "Stockholm",
      "Sodertalje"
    ],
    "Uppsala": [
      "Uppsala"
    ],
    "Sodermanland": [
      "Eskilstuna",
      "Nykoping"
    ],
    "Ostergotland": [
      "Linkoping",
      "Norrkoping"
    ],
    "Jonkoping": [
      "Jonkoping"
    ],
    "Kronoberg": [
      "Vaxjo"
    ],
    "Kalmar": [
      "Kalmar"
    ],
    "Gotland": [
      "Visby"
    ],
    "Blekinge": [
      "Karlskrona"
    ],
    "Skane": [
      "Malmo",
      "Lund"
    ],
    "Halland": [
      "Halmstad"
    ],
    "Vastra Gotaland": [
      "Gothenburg",
      "Boras"
    ],
    "Varmland": [
      "Karlstad"
    ],
    "Orebro": [
      "Orebro"
    ],
    "Vastmanland": [
      "Vasteras"
    ],
    "Dalarna": [
      "Falun",
      "Borlange"
    ],
    "Gavleborg": [
      "Gavle"
    ],
    "Vasternorrland": [
      "Sundsvall"
    ],
    "Jamtland": [
      "Ostersund"
    ],
    "Vasterbotten": [
      "Umea"
    ],
    "Norrbotten": [
      "Lulea"
    ]
  },
  "Norway": {
    "Oslo": [
      "Oslo"
    ],
    "Akershus": [
      "Lillestrom",
      "Sandvika"
    ],
    "Buskerud": [
      "Drammen"
    ],
    "Ostfold": [
      "Fredrikstad",
      "Sarpsborg"
    ],
    "Innlandet": [
      "Hamar",
      "Lillehammer"
    ],
    "Vestfold": [
      "Tonsberg",
      "Sandefjord"
    ],
    "Telemark": [
      "Skien"
    ],
    "Agder": [
      "Kristiansand",
      "Arendal"
    ],
    "Rogaland": [
      "Stavanger",
      "Haugesund"
    ],
    "Vestland": [
      "Bergen"
    ],
    "More og Romsdal": [
      "Alesund",
      "Molde"
    ],
    "Trondelag": [
      "Trondheim"
    ],
    "Nordland": [
      "Bodo"
    ],
    "Troms": [
      "Tromso"
    ],
    "Finnmark": [
      "Alta",
      "Kirkenes"
    ]
  },
  "Denmark": {
    "Capital Region": [
      "Copenhagen",
      "Helsingor"
    ],
    "Central Denmark": [
      "Aarhus",
      "Herning"
    ],
    "North Denmark": [
      "Aalborg"
    ],
    "Region Zealand": [
      "Roskilde",
      "Koge"
    ],
    "Southern Denmark": [
      "Odense",
      "Esbjerg"
    ]
  },
  "Saudi Arabia": {
    "Riyadh": [
      "Riyadh"
    ],
    "Makkah": [
      "Jeddah",
      "Makkah",
      "Taif"
    ],
    "Madinah": [
      "Madinah",
      "Yanbu"
    ],
    "Eastern Province": [
      "Dammam",
      "Khobar",
      "Dhahran"
    ],
    "Asir": [
      "Abha",
      "Khamis Mushait"
    ],
    "Tabuk": [
      "Tabuk"
    ],
    "Qassim": [
      "Buraidah",
      "Unaizah"
    ],
    "Hail": [
      "Hail"
    ],
    "Northern Borders": [
      "Arar"
    ],
    "Jazan": [
      "Jazan"
    ],
    "Najran": [
      "Najran"
    ],
    "Al Bahah": [
      "Al Bahah"
    ],
    "Al Jawf": [
      "Sakaka"
    ]
  },
  "New Zealand": {
    "Northland": [
      "Whangarei"
    ],
    "Auckland": [
      "Auckland"
    ],
    "Waikato": [
      "Hamilton",
      "Taupo"
    ],
    "Bay of Plenty": [
      "Tauranga",
      "Rotorua"
    ],
    "Gisborne": [
      "Gisborne"
    ],
    "Hawke’s Bay": [
      "Napier",
      "Hastings"
    ],
    "Taranaki": [
      "New Plymouth"
    ],
    "Manawatu-Whanganui": [
      "Palmerston North",
      "Whanganui"
    ],
    "Wellington": [
      "Wellington",
      "Lower Hutt"
    ],
    "Tasman": [
      "Richmond"
    ],
    "Nelson": [
      "Nelson"
    ],
    "Marlborough": [
      "Blenheim"
    ],
    "West Coast": [
      "Greymouth"
    ],
    "Canterbury": [
      "Christchurch",
      "Timaru"
    ],
    "Otago": [
      "Dunedin",
      "Queenstown"
    ],
    "Southland": [
      "Invercargill"
    ],
    "Chatham Islands": [
      "Waitangi"
    ]
  },
  "Singapore": {
    "Central Region": [
      "Singapore",
      "Bishan",
      "Toa Payoh"
    ],
    "East Region": [
      "Tampines",
      "Bedok",
      "Pasir Ris"
    ],
    "North Region": [
      "Woodlands",
      "Yishun"
    ],
    "North-East Region": [
      "Sengkang",
      "Punggol",
      "Hougang"
    ],
    "West Region": [
      "Jurong East",
      "Jurong West",
      "Bukit Batok"
    ]
  },
  "India": {
    "Andhra Pradesh": [
      "Visakhapatnam",
      "Vijayawada"
    ],
    "Arunachal Pradesh": [
      "Itanagar"
    ],
    "Assam": [
      "Guwahati"
    ],
    "Bihar": [
      "Patna",
      "Gaya"
    ],
    "Chhattisgarh": [
      "Raipur",
      "Bhilai"
    ],
    "Goa": [
      "Panaji",
      "Margao"
    ],
    "Haryana": [
      "Gurugram",
      "Faridabad"
    ],
    "Himachal Pradesh": [
      "Shimla",
      "Dharamshala"
    ],
    "Jharkhand": [
      "Ranchi",
      "Jamshedpur"
    ],
    "Kerala": [
      "Kochi",
      "Thiruvananthapuram"
    ],
    "Madhya Pradesh": [
      "Indore",
      "Bhopal"
    ],
    "Manipur": [
      "Imphal"
    ],
    "Meghalaya": [
      "Shillong"
    ],
    "Mizoram": [
      "Aizawl"
    ],
    "Nagaland": [
      "Kohima",
      "Dimapur"
    ],
    "Odisha": [
      "Bhubaneswar",
      "Cuttack"
    ],
    "Punjab": [
      "Ludhiana",
      "Amritsar"
    ],
    "Sikkim": [
      "Gangtok"
    ],
    "Tripura": [
      "Agartala"
    ],
    "Uttarakhand": [
      "Dehradun",
      "Haridwar"
    ],
    "Andaman and Nicobar Islands": [
      "Port Blair"
    ],
    "Chandigarh": [
      "Chandigarh"
    ],
    "Dadra and Nagar Haveli and Daman and Diu": [
      "Daman",
      "Silvassa"
    ],
    "Jammu and Kashmir": [
      "Srinagar",
      "Jammu"
    ],
    "Ladakh": [
      "Leh"
    ],
    "Lakshadweep": [
      "Kavaratti"
    ],
    "Puducherry": [
      "Puducherry"
    ]
  }
};

for (const [country, regions] of Object.entries(ADDITIONAL_LOCATIONS)) {
  const current = CITIES_BY_COUNTRY_REGION[country] ?? {};
  CITIES_BY_COUNTRY_REGION[country] = { ...current, ...regions };
  REGIONS_BY_COUNTRY[country] = [...new Set([...(REGIONS_BY_COUNTRY[country] ?? []), ...Object.keys(regions)])];
}
CITIES_BY_COUNTRY_REGION.Pakistan!.Punjab = [...CITIES_BY_COUNTRY_REGION.Pakistan!.Punjab!, "Sargodha", "Sheikhupura", "Gujrat", "Sahiwal", "Rahim Yar Khan"];

export function getRegions(country: string): readonly string[] {
  return REGIONS_BY_COUNTRY[country] ?? [];
}

export function getCities(country: string, region: string): readonly string[] {
  return CITIES_BY_COUNTRY_REGION[country]?.[region] ?? [];
}

