import React, { useState, useEffect, useCallback, useMemo } from "react";

/* ============================================================
   VPLL SIMULATION ENGINE
   Vermont Professional Lacrosse League — Phase 1 + Phase 2
   ============================================================ */

/* ---------- EMBEDDED LEAGUE DATA ---------- */
const RAW_DATA = {"teams":{"Saint Albans Dawnlanders":{"conf":"Lake","div":"Coastal","region":"Lakeshore North","score":75,"tag":"Young & Inexperienced","bal":3,"offPos":8,"offPac":7,"offRisk":8,"defPos":8,"defPre":7,"defRisk":8,"fofClm":7,"fofCon":7,"glcStp":7,"glcCon":8,"glcPas":7,"pp":8,"pk":7,"clutch":7,"tcon":8,"riding":7,"clearing":8},"Milton Machine":{"conf":"Lake","div":"Coastal","region":"Lakeshore North","score":56,"tag":"Rebuilding / Unknown","bal":3,"offPos":5,"offPac":4,"offRisk":4,"defPos":9,"defPre":5,"defRisk":5,"fofClm":6,"fofCon":5,"glcStp":8,"glcCon":6,"glcPas":6,"pp":5,"pk":6,"clutch":6,"tcon":6,"riding":4,"clearing":6},"Grand Isle Heroes":{"conf":"Lake","div":"Coastal","region":"Lakeshore North","score":76,"tag":"Veteran-led","bal":4,"offPos":9,"offPac":7,"offRisk":7,"defPos":8,"defPre":7,"defRisk":6,"fofClm":8,"fofCon":8,"glcStp":8,"glcCon":8,"glcPas":8,"pp":9,"pk":6,"clutch":8,"tcon":8,"riding":7,"clearing":8},"Missisquoi Bay Muskies":{"conf":"Lake","div":"Coastal","region":"Lakeshore North","score":66,"tag":"Young & Inexperienced","bal":7,"offPos":6,"offPac":5,"offRisk":9,"defPos":7,"defPre":6,"defRisk":8,"fofClm":6,"fofCon":6,"glcStp":6,"glcCon":6,"glcPas":7,"pp":6,"pk":8,"clutch":6,"tcon":7,"riding":8,"clearing":6},"Colchester Gryphons":{"conf":"Lake","div":"Metro West","region":"Lakeshore North","score":80,"tag":"Deep Roster","bal":4,"offPos":9,"offPac":8,"offRisk":7,"defPos":8,"defPre":7,"defRisk":7,"fofClm":7,"fofCon":7,"glcStp":8,"glcCon":8,"glcPas":7,"pp":9,"pk":7,"clutch":9,"tcon":9,"riding":7,"clearing":9},"Queen City Battery":{"conf":"Lake","div":"Metro West","region":"Lakeshore North","score":59,"tag":"Veteran-led","bal":2,"offPos":7,"offPac":6,"offRisk":6,"defPos":7,"defPre":6,"defRisk":6,"fofClm":5,"fofCon":5,"glcStp":9,"glcCon":7,"glcPas":6,"pp":5,"pk":7,"clutch":6,"tcon":5,"riding":4,"clearing":6},"North End Horsemen":{"conf":"Lake","div":"Metro West","region":"Lakeshore North","score":80,"tag":"Young & Inexperienced","bal":7,"offPos":6,"offPac":10,"offRisk":10,"defPos":7,"defPre":9,"defRisk":9,"fofClm":6,"fofCon":5,"glcStp":7,"glcCon":8,"glcPas":9,"pp":9,"pk":7,"clutch":7,"tcon":7,"riding":10,"clearing":8},"Onion River Predators":{"conf":"Lake","div":"Metro West","region":"Lakeshore North","score":76,"tag":"Deep Roster","bal":5,"offPos":8,"offPac":7,"offRisk":8,"defPos":9,"defPre":8,"defRisk":6,"fofClm":8,"fofCon":8,"glcStp":8,"glcCon":6,"glcPas":7,"pp":7,"pk":8,"clutch":8,"tcon":8,"riding":7,"clearing":8},"Essex Railroaders":{"conf":"Lake","div":"Metro East","region":"Lakeshore South","score":80,"tag":"Deep Roster","bal":5,"offPos":9,"offPac":9,"offRisk":6,"defPos":8,"defPre":8,"defRisk":7,"fofClm":8,"fofCon":9,"glcStp":8,"glcCon":9,"glcPas":8,"pp":9,"pk":8,"clutch":8,"tcon":8,"riding":7,"clearing":8},"South Burlington Aviators":{"conf":"Lake","div":"Metro East","region":"Lakeshore South","score":80,"tag":"Star Dependent","bal":3,"offPos":8,"offPac":9,"offRisk":7,"defPos":8,"defPre":8,"defRisk":9,"fofClm":9,"fofCon":8,"glcStp":8,"glcCon":8,"glcPas":7,"pp":9,"pk":8,"clutch":8,"tcon":7,"riding":7,"clearing":8},"Williston Lynx":{"conf":"Lake","div":"Metro East","region":"Lakeshore South","score":64,"tag":"Deep Roster","bal":7,"offPos":6,"offPac":7,"offRisk":9,"defPos":7,"defPre":6,"defRisk":5,"fofClm":6,"fofCon":6,"glcStp":7,"glcCon":7,"glcPas":6,"pp":7,"pk":7,"clutch":5,"tcon":7,"riding":6,"clearing":6},"Jericho Stags":{"conf":"Lake","div":"Metro East","region":"Lakeshore South","score":44,"tag":"Rebuilding / Unknown","bal":5,"offPos":4,"offPac":5,"offRisk":7,"defPos":5,"defPre":4,"defRisk":6,"fofClm":4,"fofCon":5,"glcStp":4,"glcCon":4,"glcPas":5,"pp":5,"pk":5,"clutch":4,"tcon":5,"riding":4,"clearing":3},"Fair Haven Tycoons":{"conf":"Lake","div":"Valley","region":"Lakeshore South","score":62,"tag":"Rebuilding / Unknown","bal":4,"offPos":6,"offPac":7,"offRisk":7,"defPos":5,"defPre":5,"defRisk":6,"fofClm":7,"fofCon":6,"glcStp":9,"glcCon":9,"glcPas":7,"pp":5,"pk":7,"clutch":6,"tcon":5,"riding":4,"clearing":7},"Charlotte Navigators":{"conf":"Lake","div":"Valley","region":"Lakeshore South","score":85,"tag":"Deep Roster","bal":4,"offPos":9,"offPac":8,"offRisk":8,"defPos":9,"defPre":7,"defRisk":7,"fofClm":9,"fofCon":9,"glcStp":9,"glcCon":9,"glcPas":8,"pp":9,"pk":8,"clutch":9,"tcon":9,"riding":6,"clearing":9},"Shelburne Reapers":{"conf":"Lake","div":"Valley","region":"Lakeshore South","score":80,"tag":"Deep Roster","bal":6,"offPos":7,"offPac":8,"offRisk":8,"defPos":8,"defPre":8,"defRisk":9,"fofClm":7,"fofCon":8,"glcStp":8,"glcCon":8,"glcPas":9,"pp":8,"pk":8,"clutch":8,"tcon":9,"riding":8,"clearing":8},"Middlebury RiverWolves":{"conf":"Lake","div":"Valley","region":"Lakeshore South","score":65,"tag":"Young & Inexperienced","bal":9,"offPos":6,"offPac":9,"offRisk":9,"defPos":5,"defPre":6,"defRisk":7,"fofClm":6,"fofCon":6,"glcStp":6,"glcCon":6,"glcPas":8,"pp":7,"pk":6,"clutch":7,"tcon":6,"riding":7,"clearing":6},"Jay StormKings":{"conf":"Moun","div":"Kingdom","region":"Mountainside North","score":85,"tag":"Deep Roster","bal":5,"offPos":9,"offPac":8,"offRisk":7,"defPos":9,"defPre":8,"defRisk":6,"fofClm":9,"fofCon":9,"glcStp":9,"glcCon":9,"glcPas":8,"pp":9,"pk":8,"clutch":9,"tcon":9,"riding":9,"clearing":8},"Saint Johnsbury Dinos":{"conf":"Moun","div":"Kingdom","region":"Mountainside North","score":67,"tag":"Veteran-led","bal":4,"offPos":7,"offPac":6,"offRisk":6,"defPos":7,"defPre":6,"defRisk":6,"fofClm":7,"fofCon":6,"glcStp":7,"glcCon":7,"glcPas":5,"pp":6,"pk":8,"clutch":6,"tcon":7,"riding":5,"clearing":8},"Enosburg Owls":{"conf":"Moun","div":"Kingdom","region":"Mountainside North","score":76,"tag":"Deep Roster","bal":7,"offPos":7,"offPac":8,"offRisk":7,"defPos":8,"defPre":7,"defRisk":5,"fofClm":8,"fofCon":6,"glcStp":8,"glcCon":8,"glcPas":7,"pp":8,"pk":8,"clutch":8,"tcon":8,"riding":7,"clearing":8},"Newport Spirits":{"conf":"Moun","div":"Kingdom","region":"Mountainside North","score":53,"tag":"Young & Inexperienced","bal":4,"offPos":6,"offPac":6,"offRisk":7,"defPos":5,"defPre":6,"defRisk":5,"fofClm":6,"fofCon":4,"glcStp":6,"glcCon":6,"glcPas":7,"pp":5,"pk":6,"clutch":6,"tcon":4,"riding":5,"clearing":4},"Stowe Smugglers":{"conf":"Moun","div":"Capital","region":"Mountainside North","score":83,"tag":"Deep Roster","bal":6,"offPos":9,"offPac":8,"offRisk":9,"defPos":8,"defPre":7,"defRisk":9,"fofClm":8,"fofCon":8,"glcStp":9,"glcCon":8,"glcPas":8,"pp":8,"pk":8,"clutch":9,"tcon":9,"riding":7,"clearing":9},"Rutland Cryptids":{"conf":"Moun","div":"Capital","region":"Mountainside North","score":74,"tag":"Veteran-led","bal":2,"offPos":7,"offPac":7,"offRisk":7,"defPos":9,"defPre":5,"defRisk":6,"fofClm":6,"fofCon":6,"glcStp":8,"glcCon":8,"glcPas":6,"pp":7,"pk":8,"clutch":7,"tcon":8,"riding":8,"clearing":8},"Barre Carvers":{"conf":"Moun","div":"Capital","region":"Mountainside North","score":66,"tag":"Veteran-led","bal":4,"offPos":7,"offPac":5,"offRisk":7,"defPos":6,"defPre":7,"defRisk":7,"fofClm":7,"fofCon":6,"glcStp":6,"glcCon":6,"glcPas":6,"pp":8,"pk":5,"clutch":8,"tcon":6,"riding":6,"clearing":7},"Montpelier Congress":{"conf":"Moun","div":"Capital","region":"Mountainside North","score":71,"tag":"Young & Inexperienced","bal":4,"offPos":7,"offPac":7,"offRisk":7,"defPos":7,"defPre":5,"defRisk":6,"fofClm":8,"fofCon":7,"glcStp":6,"glcCon":8,"glcPas":7,"pp":8,"pk":6,"clutch":7,"tcon":8,"riding":6,"clearing":8},"Ludlow Shepherds":{"conf":"Moun","div":"River","region":"Mountainside South","score":65,"tag":"Rebuilding / Unknown","bal":6,"offPos":6,"offPac":6,"offRisk":8,"defPos":7,"defPre":6,"defRisk":5,"fofClm":6,"fofCon":6,"glcStp":7,"glcCon":7,"glcPas":6,"pp":7,"pk":7,"clutch":8,"tcon":8,"riding":6,"clearing":6},"Windsor Independents":{"conf":"Moun","div":"River","region":"Mountainside South","score":81,"tag":"Deep Roster","bal":7,"offPos":8,"offPac":7,"offRisk":7,"defPos":8,"defPre":8,"defRisk":6,"fofClm":8,"fofCon":7,"glcStp":7,"glcCon":7,"glcPas":8,"pp":9,"pk":9,"clutch":8,"tcon":8,"riding":8,"clearing":8},"Woodstock Boilers":{"conf":"Moun","div":"River","region":"Mountainside South","score":68,"tag":"Young & Inexperienced","bal":6,"offPos":7,"offPac":8,"offRisk":9,"defPos":7,"defPre":7,"defRisk":8,"fofClm":7,"fofCon":6,"glcStp":6,"glcCon":8,"glcPas":7,"pp":8,"pk":6,"clutch":6,"tcon":6,"riding":7,"clearing":6},"Springfield Hardshells":{"conf":"Moun","div":"River","region":"Mountainside South","score":81,"tag":"Veteran-led","bal":6,"offPos":9,"offPac":8,"offRisk":5,"defPos":8,"defPre":8,"defRisk":6,"fofClm":8,"fofCon":8,"glcStp":9,"glcCon":8,"glcPas":8,"pp":8,"pk":8,"clutch":9,"tcon":8,"riding":7,"clearing":9},"Hartford Rampage":{"conf":"Moun","div":"Shire","region":"Mountainside South","score":74,"tag":"Deep Roster","bal":5,"offPos":7,"offPac":7,"offRisk":6,"defPos":8,"defPre":7,"defRisk":5,"fofClm":8,"fofCon":7,"glcStp":7,"glcCon":7,"glcPas":6,"pp":7,"pk":9,"clutch":7,"tcon":8,"riding":7,"clearing":7},"Brattleboro Pioneers":{"conf":"Moun","div":"Shire","region":"Mountainside South","score":58,"tag":"Rebuilding / Unknown","bal":2,"offPos":6,"offPac":8,"offRisk":8,"defPos":6,"defPre":6,"defRisk":9,"fofClm":6,"fofCon":5,"glcStp":4,"glcCon":4,"glcPas":4,"pp":7,"pk":5,"clutch":5,"tcon":5,"riding":7,"clearing":6},"Manchester Black Bears":{"conf":"Moun","div":"Shire","region":"Mountainside South","score":75,"tag":"Star Dependent","bal":7,"offPos":7,"offPac":7,"offRisk":6,"defPos":7,"defPre":8,"defRisk":8,"fofClm":7,"fofCon":9,"glcStp":8,"glcCon":8,"glcPas":6,"pp":7,"pk":8,"clutch":8,"tcon":7,"riding":6,"clearing":8},"Bennington Prowlers":{"conf":"Moun","div":"Shire","region":"Mountainside South","score":75,"tag":"Star Dependent","bal":4,"offPos":8,"offPac":8,"offRisk":7,"defPos":7,"defPre":7,"defRisk":5,"fofClm":8,"fofCon":7,"glcStp":6,"glcCon":6,"glcPas":6,"pp":7,"pk":7,"clutch":8,"tcon":7,"riding":7,"clearing":9}},"players":{"Saint Albans Dawnlanders":[["Leon Finley","A","L",30,82,0,65,2,77],["Taylor Dudley","A","R",23,84,0,63,3,71],["Walt Burns","A","R",35,87,1,68,2,56],["Nodin Sunday","A","L",24,87,0,61,4,41],["Noah Archer","A","L",23,79,0,33,1,58],["Don Horton","M","R",23,79,0,21,4,67],["Albert Granger","M","R",36,90,1,54,5,60],["Herb Slaughter","M","R",34,76,0,53,2,46],["Royce Emerson","M","R",23,80,0,80,1,42],["Ryder Ndiaye","M","A",23,84,0,41,1,73],["Joseph Bouchard","M","L",35,74,0,51,3,65],["Theo Hutchins","M","L",38,81,0,51,4,39],["Brennan Hill","M","R",24,82,0,26,4,43],["Micah Broadus","M","R",29,80,0,60,1,89],["Axel Champagne","D","R",30,81,0,84,3,98],["Blake Smoke","D","R",41,83,0,52,4,48],["Gaston Couture","D","A",34,81,0,54,1,37],["Rhett Everett","D","R",22,79,0,34,6,74],["Ken Osei","D","L",20,81,0,32,1,74],["Colin Abernathy","D","A",34,77,0,53,1,67],["Kenny Hobbs","F","R",23,81,0,32,2,41],["Dominick Compton","F","R",21,83,0,65,3,91],["Kendall Carver","G","R",23,77,0,54,3,98],["Brent Beaumont","G","L",22,84,0,68,2,44],["Ethan Gill","G","R",32,74,0,39,4,63]],"Milton Machine":[["Beckett Crawford","A","L",25,59,0,74,2,98],["Jax Armstrong","A","L",25,60,0,25,1,28],["Barrett Barker","A","R",35,65,0,77,5,29],["Ivan Printup","A","R",25,59,0,76,6,72],["Tanner Cameron","A","A",28,64,0,68,4,64],["Cornelius Carmichael","M","R",28,62,0,76,3,56],["Bryant Lazore","M","A",22,67,1,60,7,55],["Damian Gibson","M","R",24,66,0,18,3,67],["August Hubbard","M","A",24,63,0,23,3,83],["Brice Nolett","M","A",26,63,0,66,9,99],["Pedro Brassard","M","R",24,61,0,39,3,79],["Patrick Boots","M","R",29,57,0,58,6,61],["John Freeman","M","R",32,62,0,78,4,60],["Benny Sunday","M","R",34,67,1,74,3,39],["Mark Farrell","D","R",25,64,0,11,3,48],["Benjamin Nolett","D","A",27,62,0,86,4,71],["Vaughn Gardner","D","L",20,62,0,77,3,84],["Rod Colburn","D","R",20,63,0,35,5,64],["Barry Skye","D","R",25,64,0,74,7,69],["Reggie Barrett","D","R",26,68,0,23,1,56],["Frankie Langley","F","R",22,59,0,60,4,62],["Nico Houston","F","R",41,60,0,61,10,47],["Sawyer Chevalier","G","R",29,72,0,69,5,59],["Robbie Dumont","G","L",28,67,0,27,2,40],["Armand Justice","G","R",26,65,0,39,3,67]],"Grand Isle Heroes":[["Noel Clause","A","L",38,84,0,80,7,75],["Thomas Higgins","A","R",35,83,0,38,5,45],["Willie Oakes","A","R",27,86,0,76,9,79],["Marshall Dubois","A","R",37,80,0,23,6,22],["Kelly Bradford","A","R",27,85,0,41,4,58],["Jay Gallagher","M","R",21,79,0,56,4,85],["Owen Farnsworth","M","A",32,79,0,74,4,59],["Alden Hardy","M","R",26,77,0,98,1,63],["Stephen Baker","M","R",20,79,0,70,3,71],["Neal Broadus","M","L",30,80,0,65,5,57],["Archer Cameron","M","R",31,80,0,39,5,73],["Cassius Connolly","M","R",41,89,1,84,8,40],["Alden Hendricks","M","L",21,77,0,28,4,53],["Onatah Chase","M","L",23,81,0,52,9,66],["Joshua Hamilton","D","L",38,82,0,81,6,62],["Jared Curtis","D","R",22,77,0,66,3,59],["Devon Hastings","D","A",26,82,0,45,5,46],["Russell Broadus","D","R",24,86,1,36,2,63],["Terrell Ingram","D","R",24,81,0,56,5,70],["Nico Lawson","D","A",35,78,0,53,4,70],["Isaac Porter","F","R",26,84,0,42,7,66],["Stefan Dunmore","F","L",27,85,0,48,5,50],["Raymond Knight","G","R",40,80,0,55,4,36],["Norman Corriveau","G","R",41,84,0,54,1,17],["Elias Fuller","G","A",27,80,0,45,5,67]],"Missisquoi Bay Muskies":[["Moses Holmes","A","R",21,78,0,71,7,78],["Stewart Hooper","A","R",20,72,0,64,10,62],["Easton Duffy","A","A",23,73,0,10,4,42],["Lincoln Bancroft","A","A",24,75,0,60,8,82],["Bruce Durant","A","R",36,74,0,99,4,41],["Reuben Hawkins","M","R",20,65,0,43,8,49],["Marshall Desjardins","M","R",20,75,0,78,8,84],["Frank Barnes","M","L",35,72,0,71,7,75],["Irving Blackwell","M","L",21,68,0,66,10,76],["Bo Sterling","M","R",38,67,0,83,8,64],["Terrell Hobbs","M","R",22,71,0,62,9,61],["Ben Aldrich","M","R",23,68,0,61,1,65],["Darren Dunmore","M","L",22,65,0,33,9,54],["Derrick Collins","M","A",39,66,0,73,5,69],["Keaton Hayward","D","L",27,73,0,80,5,61],["Lawrence Garrison","D","A",21,70,0,78,6,81],["Rusty Bergeron","D","L",23,77,1,83,2,56],["Zach Hardy","D","R",22,64,0,22,8,67],["Reid Shenandoah","D","R",22,72,0,79,7,99],["Howard Doherty","D","L",41,71,0,64,6,81],["William Neptune","F","R",35,67,0,28,9,58],["Riley Carlisle","F","R",24,68,0,68,9,74],["Reese Henderson","G","R",35,72,0,50,7,30],["Gabriel Marlow","G","A",23,71,0,69,3,87],["Tobias Elliott","G","L",24,74,0,79,10,64]],"Colchester Gryphons":[["Stefan Boykin","A","R",24,82,0,40,5,51],["Rob Davenport","A","A",22,88,0,36,2,58],["David Buchanan","A","R",35,89,1,74,2,53],["Timothy Grayson","A","R",29,93,1,67,2,38],["Kobe Durant","A","R",25,81,0,82,3,72],["Pascal Decker","M","R",27,80,0,58,5,62],["Harlan Ndiaye","M","A",21,83,0,47,1,48],["Ashton Bartlett","M","L",27,83,0,28,3,67],["Nicholas Diallo","M","R",21,79,0,57,2,52],["Clayton Hopkins","M","L",20,85,0,73,2,68],["Cullen Armstrong","M","R",31,82,0,59,1,37],["Jeremy Everett","M","R",24,78,0,83,7,88],["Clark Duncan","M","R",35,83,0,65,2,57],["Pat Goodwin","M","A",29,83,0,52,7,52],["Brian Hughes","D","R",33,83,0,55,7,63],["Ohanzee Dumont","D","L",38,74,0,58,9,58],["Wade Brewer","D","R",23,85,0,43,1,41],["Eric Bouchard","D","R",30,77,0,42,1,51],["Declan Frost","D","R",29,79,0,49,8,29],["Etienne Gallagher","D","R",29,76,0,18,8,71],["Dominick Desrosiers","F","R",27,82,0,44,6,45],["Dalton Cross","F","A",24,80,0,58,5,60],["Dillon Lavoie","G","L",29,85,0,39,3,85],["Herb Farnsworth","G","R",25,88,0,42,5,48],["Leland Wawanolet","G","R",25,83,0,24,6,65]],"Queen City Battery":[["Joe Fontaine","A","A",31,67,0,75,1,75],["Gaston Beckett","A","R",24,68,0,67,5,31],["Jerry Hancock","A","L",33,66,0,82,1,87],["Derrick Hairston","A","L",41,71,0,65,1,67],["Curtis Printup","A","R",24,62,0,79,6,57],["Andrew Dubois","M","L",24,69,0,80,4,61],["Shaun Cote","M","R",29,67,0,65,1,78],["Sherman Okafor","M","R",34,60,0,78,4,36],["Shawn Marlow","M","R",24,67,0,56,2,55],["Cam Hoyt","M","R",28,74,1,99,1,55],["Russell Hale","M","L",37,66,0,83,2,53],["Marvin Jocks","M","R",23,70,0,74,6,59],["Luther Conley","M","R",26,64,0,74,1,52],["Bryan Cunningham","M","R",28,59,0,53,1,66],["Barrett Caldwell","D","R",28,73,0,70,7,65],["Andy Carmichael","D","R",25,67,0,49,1,60],["Timothy Hoyt","D","A",37,66,0,64,1,57],["Rob Lacroix","D","R",26,67,0,30,1,41],["Toby Tarbell","D","R",33,70,0,62,4,93],["Pascal Dawson","D","L",32,73,1,87,1,89],["Jamie Dixon","F","R",28,68,0,36,4,70],["Dominic Baxter","F","R",29,69,0,72,1,63],["Zach Goodwin","G","R",27,71,0,31,3,63],["Luther Pelletier","G","R",27,74,0,82,3,79],["Derek Bradford","G","L",28,74,0,15,3,67]],"North End Horsemen":[["Taylor Hill","A","R",20,82,0,46,9,52],["Winston Burnett","A","R",32,87,1,96,10,60],["Quentin Mackenzie","A","R",20,86,0,76,7,67],["Kellen Atkins","A","R",24,77,0,72,5,86],["Jackson Barker","A","R",32,80,0,57,8,63],["Curt Washington","M","L",27,84,0,47,8,27],["Gerald Bowen","M","R",21,87,0,34,7,56],["Brendan Okafor","M","A",33,86,0,66,6,82],["Daniel Lazore","M","R",39,86,0,69,10,55],["Zack Hastings","M","R",21,86,0,79,7,53],["Cash Lawson","M","R",30,96,1,99,9,73],["Dominick Kirkland","M","A",22,84,0,53,8,75],["Kellen Alcott","M","A",35,88,0,48,6,70],["Lance Fitzgerald","M","R",41,88,0,48,9,63],["Santiago Delacroix","D","L",24,86,0,54,2,66],["Quinn Delacroix","D","A",21,85,0,72,9,66],["Barrett Clarke","D","A",34,87,0,62,5,61],["Joey Winfield","D","R",39,88,1,80,9,54],["Colt Curtis","D","R",22,88,0,97,5,61],["Glen Lemieux","D","R",20,83,0,44,9,75],["Tanner Maracle","F","A",40,78,0,60,10,61],["Elijah Bennett","F","R",22,73,0,46,6,59],["Bryan Burgess","G","L",21,81,0,63,5,66],["Derrick Jennings","G","L",20,85,0,61,6,74],["Mathieu Mason","G","L",23,84,0,10,7,79]],"Onion River Predators":[["Rene Hawkins","A","L",25,81,0,50,7,36],["Eugene Clark","A","L",32,82,1,76,4,74],["Eugene Fraser","A","A",30,83,0,57,4,73],["Sawyer Bradford","A","R",40,78,0,84,2,43],["Teddy Church","A","R",24,80,0,63,4,61],["Dennis Holden","M","R",32,86,0,52,6,46],["Tommy Mackenzie","M","R",25,83,0,65,9,71],["Andre Elliott","M","R",27,84,0,73,10,58],["Otto Banks","M","R",24,79,0,50,4,46],["Eddie Harrington","M","R",29,81,0,69,7,75],["Lorenzo Gallagher","M","R",22,81,0,58,2,63],["Gus Fuller","M","L",34,85,0,90,2,43],["Benjamin Hoyt","M","R",26,85,0,76,5,62],["Terrence Fraser","M","R",35,84,0,57,3,46],["Weston Colby","D","R",25,85,0,44,3,68],["Sebastian Marchand","D","L",27,84,0,56,5,44],["Robbie Barker","D","R",25,84,0,48,1,75],["Orlando Henderson","D","R",29,79,0,56,3,91],["Otis Lemieux","D","L",27,81,0,59,6,56],["Stefan Fontaine","D","R",24,85,0,48,6,25],["Lonnie Drake","F","R",22,82,0,54,8,66],["Spencer Lambert","F","R",23,83,0,50,2,87],["Emerson Donovan","G","R",24,76,0,65,2,55],["Vaughn Doyle","G","R",26,83,0,66,1,66],["Trent Carlisle","G","R",34,80,0,99,6,59]],"Essex Railroaders":[["Boone Hallett","A","R",27,85,0,41,4,70],["Ellis Caldwell","A","R",31,80,0,68,4,99],["Sheldon Ouellet","A","R",23,85,0,29,8,52],["Roy Bradford","A","L",27,87,0,65,7,53],["Jefferson Boots","A","R",32,96,1,56,7,68],["Graham Mason","M","R",23,78,0,40,4,73],["Lyle Archambault","M","R",37,90,1,74,5,58],["Ken Tarbell","M","L",29,83,0,76,7,79],["Gil Hughes","M","R",22,84,0,39,3,56],["Nathan Marchand","M","R",27,84,0,30,7,33],["Ben Dalton","M","L",21,83,0,67,4,25],["Earl Ellsworth","M","R",30,86,0,88,4,69],["Norman Foley","M","R",38,81,0,99,7,57],["Hans Printup","M","L",25,89,0,65,10,67],["Garrett Tarbell","D","R",27,80,0,69,7,40],["Nick Horton","D","A",27,82,0,69,6,75],["Thomas Brigham","D","L",24,84,0,40,8,54],["Conner Haynes","D","R",25,82,0,64,2,85],["Andrew Ingram","D","L",27,83,0,71,7,47],["Gilles Higgins","D","L",29,86,0,99,5,49],["Oscar Bancroft","F","R",20,83,0,10,3,38],["Emerson Horton","F","L",21,80,0,60,5,49],["August Booker","G","R",30,87,0,79,5,64],["Harry Hammond","G","R",33,85,0,64,7,84],["Marvin Graves","G","L",35,85,0,75,8,38]],"South Burlington Aviators":[["Ryan Doxtator","A","R",24,78,0,48,8,46],["Abe Lolar","A","L",21,88,1,32,7,51],["Corey Currier","A","L",22,85,0,72,5,46],["Antonio Doyle","A","R",27,84,1,38,3,58],["Jarrett Forbes","A","A",24,81,0,36,3,52],["Orion Annance","M","R",26,83,0,47,7,60],["Jasper Cross","M","R",25,86,0,55,5,40],["Elliot Panadis","M","R",21,81,0,84,5,66],["Drew Hill","M","L",28,87,0,29,10,58],["Jude Campbell","M","R",31,83,0,39,4,76],["Shawn Morin","M","L",40,88,0,70,2,56],["Reggie Higgins","M","R",28,83,0,66,5,58],["Albert Fitzgerald","M","L",35,84,0,85,1,58],["Philippe Hopkins","M","L",28,86,0,37,3,42],["Preston Kearney","D","R",26,82,0,11,7,40],["Terrance Armstrong","D","R",25,83,0,62,3,74],["Devin Higgins","D","R",26,86,0,43,3,65],["Elias Cote","D","R",38,83,0,20,4,32],["Duane Gill","D","R",30,83,0,71,9,74],["Rex Barker","D","R",32,81,0,74,3,67],["Jerome Clause","F","L",26,84,0,71,8,79],["Nicholas Battle","F","R",32,82,0,99,2,77],["Sergio Hensley","G","A",22,81,0,53,1,54],["Derek Mason","G","R",33,77,0,60,2,46],["Fred Beaumont","G","R",25,78,0,55,3,66]],"Williston Lynx":[["Remi Crawford","A","L",24,66,0,39,6,84],["Zeke Carlisle","A","R",30,75,0,84,4,62],["Gilbert Bowen","A","R",41,73,0,99,4,39],["Darius Carlisle","A","L",29,81,1,45,7,78],["Elias Barrett","A","R",25,81,1,70,7,99],["Everett Levesque","M","R",39,76,0,64,9,30],["Clark Marchand","M","R",34,67,0,99,6,54],["Gil Abbott","M","L",29,73,0,34,8,47],["Neal Henderson","M","L",22,74,0,55,8,71],["Ty Bowen","M","R",37,73,0,82,5,51],["Lawrence Couture","M","R",22,75,0,69,9,68],["Maurice Flynn","M","R",24,75,0,58,9,66],["Knox Gardner","M","R",28,75,0,83,4,88],["Taylor Rivers","M","R",33,70,0,77,7,89],["Barrett Curtis","D","R",33,66,0,65,8,63],["Charles Brant","D","L",35,69,0,35,10,64],["Sergio Foster","D","A",30,63,0,72,10,79],["Blake Steele","D","L",28,65,0,82,7,72],["Juan Abernathy","D","R",25,69,0,67,9,64],["Lincoln Matthews","D","L",41,72,0,44,8,60],["Ohanzee Blanchard","F","R",25,70,0,26,10,63],["Cameron Bolden","F","R",21,67,0,57,10,73],["Herb Champagne","G","R",23,69,0,99,7,79],["Eric Gagnon","G","L",35,78,0,52,5,56],["Frank Graham","G","R",27,71,0,67,8,47]],"Jericho Stags":[["Reed Atwater","A","L",22,58,0,89,6,78],["Seth Halloran","A","L",22,55,0,74,5,60],["Chris Fraser","A","R",26,64,1,63,3,61],["Jeremy Brennan","A","R",27,52,0,26,8,84],["Martin Hale","A","R",31,51,0,92,10,59],["Dwayne Bourgeois","M","L",25,58,0,59,6,64],["Ian Lattimore","M","R",32,56,0,86,1,56],["Sonny Bolden","M","R",30,52,0,68,2,76],["Darnell Smoke","M","R",26,51,0,35,9,63],["Johnny Cole","M","R",26,55,0,43,3,51],["Marc Ndiaye","M","R",32,53,0,46,4,56],["Pedro Wawanolet","M","L",26,58,0,46,10,54],["Barry Fletcher","M","A",23,62,0,45,3,73],["Jace Granger","M","R",28,52,0,29,8,21],["Malachi Hensley","D","A",30,53,0,90,9,41],["Walt Dubois","D","R",41,60,0,40,2,58],["Arthur Hardy","D","R",31,54,0,65,6,72],["Mika Printup","D","R",40,54,0,93,8,89],["Dane Forbes","D","A",40,50,0,94,3,41],["Greg Beckett","D","R",23,55,0,47,5,70],["Malcolm Church","F","R",34,56,0,81,6,44],["Terrence Blackwell","F","R",30,51,0,65,7,76],["Milo Grayson","G","R",28,53,0,69,4,71],["Melvin Jefferson","G","L",24,49,0,72,5,81],["Stuart Archambault","G","R",29,50,0,85,10,70]],"Fair Haven Tycoons":[["Bennett Charbonneau","A","R",26,67,0,43,5,57],["Ray Mensah","A","R",26,69,0,42,1,58],["Aaron Kimball","A","R",28,72,0,32,1,75],["Dave Archambault","A","R",26,72,0,53,5,52],["Herb Bissonette","A","R",39,67,0,53,6,21],["Joshua Hairston","M","R",40,73,0,81,5,44],["Leon Booker","M","R",28,78,1,63,9,57],["Harvey Lemieux","M","L",25,68,0,49,7,63],["Toby Colburn","M","R",25,69,0,48,4,81],["Xavier Boykin","M","R",26,73,0,67,1,54],["Benoit Kingsley","M","R",26,68,0,55,5,53],["Easton Horton","M","R",35,73,0,86,3,78],["Kai Bissonette","M","R",23,77,1,99,2,70],["Charlie Thibodeau","M","R",28,74,0,10,8,33],["Adrian Ndiaye","D","R",24,61,0,58,2,75],["Edgar Chevalier","D","R",26,69,0,79,5,80],["Isaiah Broadus","D","R",24,62,0,65,6,60],["Micky Blackwell","D","R",28,59,0,97,1,66],["Ollie Easton","D","R",26,61,0,64,5,65],["Rafael Emerson","D","L",23,56,0,41,5,47],["Jon Gagnon","F","R",36,72,0,65,3,37],["Andre Blair","F","A",40,75,0,60,4,51],["Lyle Kimball","G","L",29,76,0,39,3,91],["Jefferson Sterling","G","R",31,78,0,48,5,61],["Ken Mahoney","G","R",26,76,0,56,6,67]],"Charlotte Navigators":[["Nodin Broadus","A","R",33,92,1,72,4,49],["Knox Jennings","A","R",26,87,0,45,2,57],["Brady Bridges","A","R",38,82,0,54,5,57],["Gus Dempsey","A","R",34,94,1,63,1,52],["Harry Doxtator","A","A",29,84,0,58,10,53],["Roosevelt Garrison","M","R",30,80,0,95,4,71],["Demetrius Barrett","M","R",26,87,0,54,6,66],["Tim Gill","M","R",25,85,0,70,9,43],["Kohana Duffy","M","R",25,96,1,55,9,66],["Beau Gallagher","M","R",28,91,0,56,7,66],["Ian Everett","M","R",28,82,0,61,1,70],["Duke Blanchard","M","R",34,86,0,65,7,52],["Percy Diallo","M","R",23,86,0,78,3,53],["Kenny Sterling","M","R",23,85,0,58,6,86],["Enzo Baldwin","D","R",26,80,0,52,5,81],["Everett Champagne","D","L",26,86,0,47,5,48],["Sean Duval","D","R",31,86,0,46,4,99],["Pablo Hastings","D","R",29,86,0,83,5,84],["Johnny Emerson","D","R",25,86,0,65,3,77],["Mahigan Crowley","D","R",29,82,0,65,7,65],["Aaron Colby","F","R",22,88,0,85,5,70],["Henry Harrington","F","L",31,89,0,59,2,92],["Elliot Flynn","G","L",24,93,0,48,4,74],["Ernest Lavoie","G","R",33,90,0,20,4,99],["Reginald Bishop","G","R",29,91,0,90,3,71]],"Shelburne Reapers":[["Lionel Duncan","A","R",27,77,0,51,4,86],["Kenny Freelon","A","R",22,80,0,69,6,66],["Carl Holbrook","A","R",24,77,0,59,3,59],["Cade Callahan","A","R",31,79,0,83,7,57],["Neal Tremblay","A","R",20,80,0,43,8,60],["Kyler Burns","M","A",35,83,0,86,4,67],["Otsi Diallo","M","R",30,81,0,36,10,68],["Skyler Burke","M","R",35,83,0,99,8,58],["Dean Charbonneau","M","L",23,81,0,69,8,75],["Joshua Beauchamp","M","R",28,87,0,72,5,67],["Thomas Fowler","M","R",27,84,0,62,3,38],["Cornelius Hughes","M","R",34,83,0,61,1,44],["Gregory Slaughter","M","R",29,90,1,65,5,69],["Kennedy Blair","M","A",32,84,0,85,5,69],["Jerry Cross","D","L",41,80,0,49,6,45],["Alfie Lowell","D","R",41,92,1,86,7,51],["Jim Boots","D","R",29,81,0,62,10,70],["Dennis Monroe","D","A",31,82,0,31,8,63],["August Cross","D","L",28,92,1,76,6,71],["Stuart Chevalier","D","L",27,86,0,17,7,68],["Carson Lowell","F","R",28,82,0,41,3,81],["Everett Houston","F","L",25,81,0,57,6,83],["Kitchi Holbrook","G","R",25,91,0,99,8,55],["Phillip Watso","G","R",28,80,0,59,5,99],["Dominic Gardner","G","L",35,85,0,62,8,84]],"Middlebury RiverWolves":[["Trenton Duval","A","R",24,72,0,80,9,68],["Virgil Duffy","A","L",24,75,0,49,9,70],["Colt Abbott","A","R",20,78,0,78,3,43],["Jace Bridges","A","R",22,77,0,65,10,83],["Zack Hutchins","A","R",24,74,0,73,10,69],["Zack Booker","M","R",22,74,0,41,10,45],["Chester Traore","M","R",27,75,0,59,10,79],["Adrian Rousseau","M","R",20,80,0,62,6,53],["Elijah Blackwell","M","A",24,83,1,99,9,86],["Ezra Sterling","M","R",23,79,0,79,10,76],["Jay Deer","M","L",24,76,0,71,7,83],["Monte Barker","M","L",39,81,0,40,8,54],["Yves Brassard","M","R",21,76,0,41,10,99],["Oscar Drake","M","R",39,73,0,84,9,44],["Ricardo Brennan","D","R",21,65,0,45,10,41],["Myles Callahan","D","R",31,68,0,57,7,47],["Roger Armstrong","D","R",23,68,0,75,8,83],["Rene Dempsey","D","L",23,71,0,40,9,38],["Cole Knight","D","L",33,64,0,56,9,54],["Steven Dumont","D","L",20,69,0,97,9,53],["Vincent Colburn","F","L",33,65,0,64,8,67],["Benny Cannon","F","R",39,74,0,77,9,33],["Bennett Gallagher","G","L",40,71,0,80,7,81],["Quentin Granger","G","R",21,66,0,59,10,55],["Duane Lemieux","G","L",22,72,0,35,8,72]],"Jay StormKings":[["Drake Hooper","A","A",29,88,0,52,7,62],["Dylan Fenwick","A","R",24,85,0,68,4,50],["Nico Duffy","A","R",30,95,1,96,8,35],["Luc Panadis","A","R",33,89,0,77,5,48],["Kaleb Gibson","A","R",40,85,0,99,5,51],["Kelly Graves","M","R",25,93,1,60,3,55],["Trey Freelon","M","R",24,82,0,75,5,78],["Beckett Howard","M","A",21,97,1,89,4,48],["Connor Collins","M","R",27,86,0,63,8,77],["Juan Banks","M","A",31,91,1,88,2,70],["Joshua Beckett","M","L",33,92,0,57,5,49],["Phillip Kamara","M","R",30,84,0,84,1,87],["Peter Pelletier","M","R",21,91,0,95,5,67],["Bryan Hensley","M","L",29,86,0,67,6,49],["Wematin Higgins","D","L",30,86,0,77,9,76],["Brennan Ndiaye","D","R",27,83,0,35,4,69],["Jabari Boucher","D","R",22,85,0,81,4,76],["Carlos Compton","D","R",26,85,0,59,5,47],["Jay Kearney","D","L",24,90,0,55,2,53],["Kent Panadis","D","R",32,85,0,20,8,71],["Mack Booker","F","R",26,87,0,49,3,38],["Irving Curtis","F","R",21,86,0,70,3,48],["Rory Gardner","G","R",27,93,0,42,6,80],["Blake Marchand","G","A",24,91,0,73,6,68],["Wade Slaughter","G","A",35,91,0,99,8,45]],"Saint Johnsbury Dinos":[["Wesley Barnes","A","R",29,76,0,46,4,85],["Reese Campbell","A","L",26,74,0,61,8,52],["Dean Foster","A","L",29,79,1,53,7,52],["Kody Decker","A","R",33,70,0,71,3,72],["Dalton Hardy","A","R",34,71,0,62,4,68],["Ronnie Davenport","M","R",25,70,0,48,3,64],["Trevor Bennett","M","L",24,72,0,54,6,72],["Damien Deer","M","L",25,73,0,93,7,67],["Judd Washington","M","L",25,73,0,81,8,28],["Tom Hubbard","M","R",37,76,0,85,5,54],["Colt Fletcher","M","R",24,68,0,43,2,66],["Skyler Atkins","M","L",24,73,0,10,4,57],["Vernon Lacroix","M","R",24,69,0,10,3,69],["Zane Atkins","M","A",30,67,0,55,6,60],["Kellen Mahoney","D","R",34,67,0,30,4,63],["Otis Portneuf","D","R",29,74,0,52,6,56],["Dominic Mahoney","D","L",27,78,0,71,6,68],["Ike Lockhart","D","R",20,65,0,74,3,42],["Josiah Bouchard","D","R",20,74,0,58,2,45],["Curtis Pelletier","D","R",27,76,0,52,5,61],["Lionel Rondeau","F","L",36,70,0,68,4,64],["Jerome Donovan","F","R",35,73,0,67,2,48],["Kurt Mackenzie","G","L",36,70,0,32,2,47],["Oliver Brennan","G","R",33,72,0,79,3,69],["Cam Washington","G","A",31,74,0,75,4,61]],"Enosburg Owls":[["Gavin Elliott","A","R",24,79,0,29,9,50],["Kyler Deschamps","A","A",41,80,0,56,6,70],["Royce Baker","A","A",28,77,0,46,9,79],["Carlos Crowley","A","L",22,77,0,74,10,71],["Wapi Harmon","A","R",35,75,0,34,8,68],["Erik Knight","M","R",26,77,0,45,8,71],["Keaton Fortin","M","R",29,79,0,61,6,66],["Darius Hallett","M","R",31,84,0,65,8,70],["Larry Dunmore","M","L",22,78,0,67,5,68],["Morgan Dufresne","M","L",33,89,1,62,8,70],["Geoffrey Osei","M","R",39,81,0,61,10,63],["Ricardo Duncan","M","L",27,81,0,79,8,68],["Jeremiah Farnsworth","M","R",26,82,0,45,10,41],["Tom Fontaine","M","R",24,76,0,39,5,64],["Marvin Dubois","D","R",24,74,0,32,8,85],["Felix Girard","D","R",20,75,0,36,4,67],["Matthew Doxtator","D","L",27,74,0,33,10,86],["Roman Lockhart","D","A",35,79,0,21,8,36],["Jordan Corriveau","D","L",37,82,0,88,7,45],["Scott Barlow","D","R",29,78,0,56,9,66],["Lance Levesque","F","L",30,80,0,59,4,62],["Dean Holmes","F","A",31,77,0,62,8,61],["Bart Fontaine","G","L",21,82,0,66,5,70],["Angelo Barker","G","R",34,81,0,86,7,28],["Zack Foley","G","L",39,83,0,91,6,51]],"Newport Spirits":[["Ralph Rivers","A","A",40,72,1,45,2,32],["Trey Kimball","A","R",31,64,0,66,9,71],["Holden Barnes","A","R",41,64,0,72,5,56],["Glen Barker","A","R",40,61,0,87,3,65],["Emmett Cooper","A","R",22,68,0,56,3,44],["Kobe Hamilton","M","R",36,61,0,61,3,78],["Taylor Dufresne","M","L",22,59,0,59,3,59],["Graham Fontaine","M","R",23,65,0,30,5,51],["Carlos Hawkins","M","L",24,63,0,20,4,97],["Tanner Colburn","M","R",23,61,0,51,4,86],["Kyler Atwater","M","R",24,62,0,16,7,75],["Rudy Keating","M","R",20,66,0,76,4,86],["Morgan Hamilton","M","R",34,60,0,20,5,39],["Harold Hardy","M","L",32,64,0,70,1,80],["Christopher Dixon","D","R",24,59,0,37,2,68],["Marc Lockhart","D","A",23,54,0,42,1,63],["Brent Mason","D","R",20,62,0,83,5,66],["Maxwell Boots","D","R",20,53,0,56,6,70],["Terrence Boykin","D","R",31,63,0,34,7,75],["Mitch Callahan","D","R",21,59,0,83,1,51],["Mark Gaines","F","R",35,59,0,62,6,62],["Jarrett Boots","F","R",24,62,0,78,6,73],["Lee Sterling","G","A",33,62,0,48,3,57],["Colton Holden","G","R",22,61,0,58,1,58],["Stewart Carroll","G","L",21,59,0,45,1,44]],"Stowe Smugglers":[["Rhett Clark","A","R",25,96,1,92,5,62],["Zachary Hobbs","A","R",38,95,1,91,6,61],["Brian Fitzgerald","A","R",31,85,0,92,9,55],["Kasey Bailey","A","R",29,84,0,46,7,61],["Trenton Lattimore","A","R",25,88,0,71,6,69],["Everett Hollis","M","R",20,93,1,65,10,63],["Fred Lambert","M","L",27,90,1,37,3,73],["Brett Cole","M","R",27,85,0,48,2,82],["Laurent Abbott","M","R",24,82,0,42,4,86],["Curtis Franklin","M","R",25,90,0,99,9,58],["Donald Connolly","M","L",25,88,0,57,4,89],["Deka Annance","M","L",41,84,0,82,10,28],["Landon Dumont","M","R",35,87,0,65,8,73],["Milo Gibson","M","L",34,81,0,50,3,77],["Holden Dunmore","D","R",26,84,0,31,4,62],["Leon Clause","D","R",27,78,0,26,7,51],["Mitchell Ingram","D","R",27,84,0,89,1,51],["Xavier Hale","D","R",27,80,0,50,5,81],["Cooper Hargrove","D","R",22,80,0,54,5,58],["Archer Franklin","D","R",33,83,0,52,5,65],["Alvin Hill","F","L",25,79,0,76,10,64],["Jason Halloran","F","R",31,87,0,61,9,96],["George Bouchard","G","R",32,89,0,80,7,96],["Claude Desjardins","G","R",36,91,0,39,5,56],["Grayson Jefferson","G","R",24,81,0,61,7,68]],"Rutland Cryptids":[["Zachary Baker","A","A",21,78,0,66,1,53],["Oakley Ndiaye","A","L",28,80,0,71,3,64],["William Conley","A","R",31,76,0,58,1,67],["Morris Jefferson","A","R",26,78,0,60,4,78],["Jamal Chevalier","A","L",27,74,0,20,3,62],["Lyle Washington","M","L",35,74,0,69,1,42],["Cam Cote","M","R",25,86,1,67,2,20],["Jay Osei","M","R",20,75,0,52,1,61],["Cornelius Freeman","M","L",26,75,0,46,2,64],["Adrian Panadis","M","R",32,77,0,70,5,57],["Antonio Morin","M","R",23,78,0,59,3,64],["Fletcher Atwater","M","R",28,81,0,69,1,65],["Duncan Anderson","M","R",34,77,0,26,3,59],["Jace Bennett","M","L",30,77,0,77,1,76],["Michael Lattimore","D","R",24,74,0,54,3,62],["Dwight Forbes","D","L",29,75,0,15,3,47],["Nathaniel Oakes","D","R",30,83,0,65,4,91],["Elliot Gardner","D","L",22,70,0,41,1,66],["Todd Gagnon","D","R",26,72,0,49,1,46],["Ahanu Dunmore","D","R",34,74,0,50,4,78],["Joshua Keating","F","R",24,73,0,71,1,62],["Isaac Gagnon","F","R",31,77,0,75,5,61],["Duane Holden","G","R",31,74,0,67,3,69],["Ernest Hollis","G","L",29,86,0,35,1,32],["Philippe Washington","G","L",26,83,0,59,2,43]],"Barre Carvers":[["Sammy Hooper","A","R",29,70,0,50,2,73],["Kieran Halloran","A","R",27,82,1,53,7,54],["Taylor Ouellet","A","R",29,71,0,80,1,84],["Kasey Chevalier","A","L",24,74,0,37,4,63],["Cade Bergeron","A","A",27,73,0,52,6,55],["Armand Townsend","M","A",25,69,0,43,3,62],["Don Okafor","M","R",35,63,0,25,4,50],["Walt Hutchins","M","R",27,73,0,40,2,73],["Richard Leighton","M","R",25,70,0,97,2,40],["Kane Delacroix","M","R",22,73,0,58,1,96],["Troy Morin","M","R",21,65,0,52,6,57],["Kirk Emerson","M","R",28,67,0,30,3,84],["Alden Rivers","M","R",28,65,0,41,2,47],["Adam Haynes","M","R",22,70,0,45,2,64],["Cruz Gauthier","D","R",33,70,0,30,6,66],["Rob Barker","D","L",26,71,0,71,6,89],["Ezra Beckett","D","R",28,70,0,82,4,50],["Devon Forbes","D","R",20,76,0,58,3,60],["Abel Graves","D","R",29,74,0,13,2,88],["Russ Clause","D","L",26,74,0,38,8,50],["Arthur Houston","F","R",33,69,0,44,5,62],["Dane Boyd","F","A",35,66,0,67,5,42],["Pedro Farrell","G","R",35,71,0,44,2,41],["Mathieu Carlisle","G","R",31,70,0,66,5,79],["David Cameron","G","L",27,74,0,45,3,67]],"Montpelier Congress":[["Ahanu Hardy","A","R",23,86,1,74,5,56],["Dexter Fuller","A","R",34,82,0,86,4,40],["Rory Graham","A","R",21,77,0,31,9,56],["Lincoln Neptune","A","R",22,72,0,51,10,72],["Liam Colburn","A","R",20,82,1,64,3,82],["Ratsi Calder","M","R",24,83,0,61,6,29],["Hudson Collins","M","R",32,67,0,99,4,82],["Lars Blair","M","A",33,73,0,20,2,64],["Alexander Fortin","M","R",21,77,0,99,4,47],["Pedro Dempsey","M","R",28,77,0,61,5,83],["Michael Forbes","M","A",22,75,0,63,1,43],["Elan Holden","M","R",22,82,0,65,6,69],["Carter Bowen","M","L",23,75,0,69,4,61],["Terry Drake","M","R",23,72,0,61,6,65],["Kaleb Longtoe","D","L",33,70,0,41,6,70],["Ahanu Charbonneau","D","A",23,72,0,82,8,62],["Bill Donnelly","D","R",37,72,0,97,8,38],["Christopher Callahan","D","R",23,67,0,56,6,89],["Derek Crowley","D","L",22,71,0,37,5,61],["Trenton Baker","D","R",37,72,0,71,2,59],["Demetrius Farrell","F","L",36,74,0,61,2,63],["Xavier Lemieux","F","R",30,77,0,99,7,37],["Denis Lambert","G","R",20,73,0,82,4,66],["Brennan Hollis","G","R",23,73,0,66,4,67],["Matthew Harmon","G","A",28,77,0,51,2,68]],"Ludlow Shepherds":[["Walter Dunmore","A","R",27,74,0,75,4,65],["Wayne Clause","A","L",31,73,0,75,8,49],["Alec Gallagher","A","L",26,73,0,54,3,58],["Richard Rondeau","A","R",26,70,0,59,7,74],["Forrest Adams","A","R",30,78,0,50,5,74],["Ivan Rondeau","M","L",41,77,0,74,8,58],["Vernon Osei","M","R",27,68,0,52,3,64],["Laurent Barker","M","A",24,73,0,31,8,85],["Kofi Foster","M","L",27,71,0,33,10,59],["Derek Caldwell","M","R",25,67,0,86,4,41],["Ricky Collins","M","R",32,68,0,50,4,50],["Randy Watso","M","R",27,79,1,57,10,56],["Carl Dixon","M","R",27,70,0,45,6,98],["Yves Carpenter","M","R",20,71,0,56,4,77],["Cash Deschamps","D","R",20,68,0,30,6,59],["Elijah Tarbell","D","R",26,68,0,25,6,37],["Adam Houston","D","R",24,68,0,34,10,90],["Kendall Allen","D","R",25,69,0,41,4,52],["Rene Davenport","D","L",25,69,0,27,8,70],["Clay Griffin","D","R",35,69,0,50,8,61],["Xavier Diallo","F","L",36,70,0,59,4,54],["Willie Mercer","F","R",20,68,0,65,8,53],["Duke Grayson","G","L",25,73,0,39,5,63],["Drew Shenandoah","G","R",35,67,0,55,6,52],["Colton Maracle","G","L",27,79,1,73,7,60]],"Windsor Independents":[["Mario Bancroft","A","R",29,78,0,71,7,72],["Terrence Beckett","A","R",25,81,0,25,9,38],["Bryan Skye","A","R",33,77,0,57,8,52],["Jabari Lolar","A","L",28,80,0,34,7,49],["Kirk Decker","A","L",24,77,0,50,8,51],["Terry Brewer","M","R",31,80,0,76,8,74],["Grant Halloran","M","R",24,85,0,80,5,70],["Benjamin Delacroix","M","R",26,91,1,73,5,67],["Darren Fowler","M","R",26,81,0,72,7,76],["Travis Bissonette","M","R",28,93,1,54,6,57],["Sebastian Holbrook","M","L",24,89,1,66,9,77],["Philippe Fontaine","M","A",41,76,0,46,10,68],["Hugh Shenandoah","M","L",29,84,0,40,10,55],["Drew Okafor","M","L",27,88,0,57,10,81],["Antoine Oakes","D","L",33,82,0,75,10,70],["Stewart Corbett","D","R",28,88,1,40,6,60],["Cameron Doherty","D","R",29,86,0,47,8,48],["William Brigham","D","R",28,79,0,16,10,62],["Kurt Frost","D","R",26,78,0,50,10,63],["Waylon Ingram","D","R",40,87,0,74,10,55],["Kennedy Moten","F","R",25,83,0,53,5,46],["Stanley Dupree","F","R",29,78,0,56,8,63],["Jason Mays","G","L",28,77,0,47,9,95],["Joel Aldrich","G","R",31,82,0,78,4,60],["Ryan Fleming","G","R",31,81,0,84,5,46]],"Woodstock Boilers":[["Duncan Hendricks","A","R",37,75,0,66,8,26],["Wyatt Lowell","A","L",23,74,0,99,7,32],["Shawn Lockhart","A","L",20,76,0,35,8,59],["Rod Jocks","A","R",24,70,0,52,8,71],["Kieran Beaumont","A","R",24,76,0,34,8,79],["Wematin Townsend","M","L",38,83,1,56,10,76],["Thomas Hardy","M","R",31,76,0,60,3,71],["Thomas Currier","M","R",20,78,0,41,1,70],["Herb Hendricks","M","R",24,83,0,46,7,59],["Neil Gaines","M","L",30,75,0,99,7,84],["Warren Bolden","M","R",28,78,0,31,8,44],["Lenny Desjardins","M","L",33,71,0,76,5,74],["Daniel Slaughter","M","R",20,74,0,43,2,80],["Pascal Mercer","M","L",22,83,0,55,4,56],["Gary Bennett","D","R",34,77,0,40,8,47],["Royce Cameron","D","A",20,71,0,30,3,63],["Ohanzee Atwater","D","R",41,69,0,88,10,54],["Tom Mercer","D","L",25,78,0,53,3,64],["Terrell Carroll","D","R",22,69,0,50,4,81],["Matthew Bennett","D","R",24,80,0,63,7,69],["Ken Freelon","F","R",21,69,0,73,4,75],["Peter Rivers","F","R",33,71,0,69,5,56],["Ed Pelletier","G","A",20,73,0,60,3,51],["Cassius Bolden","G","R",22,74,0,10,8,81],["Mario Fontaine","G","L",24,70,0,52,2,88]],"Springfield Hardshells":[["Ralph Howard","A","L",23,89,1,75,5,55],["Asa Bourgeois","A","L",29,80,0,59,9,61],["Perry Tarbell","A","R",24,75,0,77,6,72],["Chogan Toussaint","A","A",39,93,1,48,9,49],["Hudson Bailey","A","L",26,81,0,91,5,74],["Gaston Carroll","M","L",31,81,0,45,5,55],["Wematin Atwater","M","R",34,82,0,68,9,49],["Kelvin Booker","M","R",29,78,0,51,4,60],["Ross Longtoe","M","R",26,83,0,73,9,79],["Koda Everett","M","L",28,86,0,65,9,63],["Omar Doherty","M","L",23,81,0,73,6,52],["Rafael Dubois","M","R",35,83,0,92,4,68],["Hayden Lowell","M","R",26,82,0,38,9,64],["Austin Graves","M","L",27,79,0,53,7,41],["Rene Charbonneau","D","R",26,83,0,42,5,32],["Everett Fowler","D","A",27,82,0,91,2,64],["Darnell Washington","D","L",27,82,0,55,7,73],["Camden Winfield","D","R",32,76,0,41,7,60],["Teddy Gallagher","D","R",27,80,0,83,4,70],["Luc Alcott","D","R",26,80,0,66,5,43],["Corey Gauthier","F","R",36,89,1,55,5,61],["Isaiah Belanger","F","A",23,85,0,59,1,78],["Pat Compton","G","A",25,83,0,22,6,69],["Tommy Deschamps","G","R",23,86,0,41,9,20],["Sterling Cole","G","A",35,86,0,65,6,89]],"Hartford Rampage":[["Sean Sunday","A","R",28,70,0,34,9,75],["Elliott Smoke","A","R",25,74,0,92,10,60],["Leonard Mackenzie","A","R",20,74,0,29,6,87],["Mark Matthews","A","R",27,72,0,53,1,68],["Elan Corbett","A","A",28,78,0,91,8,60],["Alex Dempsey","M","R",25,73,0,36,3,57],["Jaylen Lambert","M","R",41,75,0,95,5,38],["Josiah Foster","M","R",32,90,1,64,1,64],["Gregory Caldwell","M","L",36,76,0,64,6,60],["Case Cunningham","M","L",28,84,1,39,6,70],["Conrad Allen","M","R",38,77,0,53,8,73],["Sergio Easton","M","R",23,75,0,25,5,89],["Bobby Deschamps","M","R",29,81,0,65,5,88],["Dale Burke","M","R",33,75,0,87,4,66],["Felix Lazore","D","R",21,79,0,21,10,67],["Thaddeus Aldrich","D","R",27,76,0,49,6,68],["Neil Dupree","D","L",24,80,0,38,8,31],["Reginald Ndiaye","D","R",27,80,0,83,9,72],["Alvin Curtis","D","L",25,71,0,32,3,62],["Eddie Delacroix","D","R",30,76,0,69,8,68],["Brett Hammond","F","R",28,79,0,41,9,78],["Russell Deer","F","R",32,80,0,83,9,61],["Wade Crowley","G","R",33,77,0,64,9,54],["Alex Goodwin","G","R",21,75,0,56,3,68],["Austin Sunday","G","R",31,75,0,63,10,84]],"Brattleboro Pioneers":[["Rocco Bartlett","A","L",32,66,0,82,1,53],["Myles Monroe","A","R",34,68,0,76,1,60],["Marlon Blanchard","A","R",41,66,0,27,7,55],["Rashad Bradley","A","R",27,69,0,57,3,43],["Braden Rondeau","A","L",28,72,0,19,1,80],["Kaleb Mahoney","M","A",33,69,0,59,2,94],["Nicholas Gill","M","R",40,77,1,47,10,59],["Curt Hayes","M","R",21,71,0,38,3,52],["Sam Hopkins","M","R",27,66,0,66,1,34],["Reggie Chandler","M","R",36,64,0,99,2,40],["Emile Tarbell","M","A",21,72,0,74,4,39],["Archer Banks","M","R",41,84,1,95,4,63],["Graham Franklin","M","R",28,61,0,48,1,65],["Damon Longtoe","M","L",30,70,0,26,5,58],["Avery Burgess","D","L",25,61,0,48,3,81],["Clay Fuller","D","R",32,64,0,84,1,80],["Maurice Higgins","D","R",38,71,0,79,2,57],["Lloyd Drake","D","R",23,66,0,79,6,46],["Wyatt Armstrong","D","R",22,71,0,66,6,83],["Ratsi Beaulieu","D","R",30,63,0,47,4,62],["Willem Okafor","F","R",35,56,0,44,4,39],["Nico Steele","F","L",35,63,0,88,1,67],["Jeffrey Mays","G","A",21,58,0,51,4,60],["Edwin Toussaint","G","R",24,61,0,53,5,96],["Avery Hendricks","G","A",23,60,0,45,2,63]],"Manchester Black Bears":[["Cory Finley","A","R",26,71,0,48,10,69],["Toby Carpenter","A","A",27,77,0,76,9,62],["Harrison Bolden","A","R",26,72,0,61,9,59],["Frankie Lambert","A","L",33,79,0,57,8,57],["Jeffrey Sterling","A","L",33,84,1,53,8,80],["Cruz Champagne","M","L",37,76,0,35,10,58],["Kirk Bridges","M","R",28,76,0,17,4,84],["Raymond Wawanolet","M","L",24,78,0,86,10,68],["Abe Brant","M","R",37,75,0,34,10,40],["Andy Gaines","M","R",39,80,0,64,10,32],["Dan Crowley","M","R",32,75,0,78,9,68],["Isaiah Barlow","M","L",23,77,0,60,6,59],["Gus Rivers","M","R",30,76,0,52,7,46],["Quincy Beauchamp","M","R",29,85,1,74,10,68],["Ernest Hoyt","D","R",41,75,0,54,8,58],["Griffin Hallett","D","L",26,78,0,40,1,70],["Jack Corrigan","D","R",41,78,0,53,7,46],["Kent Annance","D","R",24,79,0,56,10,73],["Mark Kearney","D","R",28,79,0,63,6,85],["Ethan Forbes","D","L",21,80,0,30,1,84],["Rafael Tarbell","F","R",27,82,0,81,9,93],["William Connolly","F","A",33,82,0,57,6,66],["Jonah Curran","G","L",41,78,0,61,8,88],["Bobby Garrison","G","R",20,75,0,84,7,40],["Pat Lowell","G","L",28,76,0,46,5,73]],"Bennington Prowlers":[["Craig Deschamps","A","R",32,79,0,59,6,80],["Dallas Caldwell","A","R",20,78,0,43,1,61],["Knox Leblanc","A","L",22,83,0,84,3,45],["Damien Henderson","A","R",28,89,1,61,1,72],["Kasey Freeman","A","L",24,78,0,94,1,49],["Pedro Fontaine","M","L",34,82,0,81,4,51],["Jay Slaughter","M","R",24,91,1,50,7,85],["Fletcher Diallo","M","R",23,79,0,60,10,65],["Karl Graves","M","L",29,82,0,69,4,79],["Dave Burke","M","R",26,81,0,67,2,93],["Jake Banks","M","R",27,81,0,69,4,69],["Richard Hollis","M","R",29,79,0,67,1,57],["Gilles Corbett","M","L",29,81,0,44,6,45],["Kenneth Archambault","M","R",28,85,0,54,4,67],["DeShawn Gibson","D","A",36,75,0,67,4,78],["Wyatt Fuller","D","R",23,79,0,55,4,75],["Zane Collins","D","R",35,79,0,97,1,21],["Leon Garrison","D","L",24,76,0,42,5,68],["Solomon Gagnon","D","L",26,77,0,76,5,66],["Philip Hammond","D","R",31,75,0,51,1,53],["Frank Belanger","F","L",26,78,0,33,4,70],["Rusty Annance","F","R",29,81,0,54,6,57],["Waylon Leighton","G","R",28,76,0,44,3,59],["David Curran","G","R",20,75,0,50,1,89],["Alec Garrison","G","R",26,70,0,57,1,57]]},"coaches":{"Saint Albans Dawnlanders":{"hc":"Pat Mercer","hcArch":"The Firebrand","hcComp":50,"hcDev":65,"oc":"Andrew Blanchard","ocArch":"Possession-Based","dc":"Tim Cannon","dcArch":"Zone/Positioning"},"Milton Machine":{"hc":"Cody Toussaint","hcArch":"The Gambler","hcComp":58,"hcDev":49,"oc":"Dylan Byers","ocArch":"Possession-Based","dc":"Jonas Mason","dcArch":"Zone/Positioning"},"Grand Isle Heroes":{"hc":"Keaton Delacroix","hcArch":"The Tactician","hcComp":85,"hcDev":70,"oc":"Elliott Hughes","ocArch":"Possession-Based","dc":"Kasey Lawson","dcArch":"Zone/Positioning"},"Missisquoi Bay Muskies":{"hc":"Ernest Collins","hcArch":"The Gambler","hcComp":95,"hcDev":47,"oc":"Simon Grayson","ocArch":"Risk Taker","dc":"Lincoln Washington","dcArch":"Zone/Positioning"},"Colchester Gryphons":{"hc":"Gideon Chapman","hcArch":"The Builder","hcComp":76,"hcDev":73,"oc":"Spencer Haynes","ocArch":"Possession-Based","dc":"Craig Tarbell","dcArch":"Zone/Positioning"},"Queen City Battery":{"hc":"Rocco Forbes","hcArch":"The Builder","hcComp":72,"hcDev":76,"oc":"Lawrence Hargrove","ocArch":"Possession-Based","dc":"Pablo Holbrook","dcArch":"Penalty Kill Specialist"},"North End Horsemen":{"hc":"Herb Steele","hcArch":"The Builder","hcComp":99,"hcDev":99,"oc":"Deka Sessay","ocArch":"Up-Tempo","dc":"Treyvon Marchand","dcArch":"Pressure-Based"},"Onion River Predators":{"hc":"Wallace Harrington","hcArch":"The Players Coach","hcComp":71,"hcDev":71,"oc":"Andre Griswold","ocArch":"Possession-Based","dc":"Duane Holmes","dcArch":"Hybrid"},"Essex Railroaders":{"hc":"Dave Osei","hcArch":"The Tactician","hcComp":82,"hcDev":48,"oc":"Zane Atwater","ocArch":"Possession-Based","dc":"Lorenzo Kirkland","dcArch":"Zone/Positioning"},"South Burlington Aviators":{"hc":"Stewart Finley","hcArch":"The Players Coach","hcComp":97,"hcDev":65,"oc":"Kelly Baxter","ocArch":"Up-Tempo","dc":"Ellis Watso","dcArch":"Zone/Positioning"},"Williston Lynx":{"hc":"Lars Bowen","hcArch":"The Players Coach","hcComp":82,"hcDev":60,"oc":"Johnny Cromwell","ocArch":"Risk Taker","dc":"Keaton Brewer","dcArch":"Zone/Positioning"},"Jericho Stags":{"hc":"Conrad Hendricks","hcArch":"The Gambler","hcComp":40,"hcDev":57,"oc":"Joey Bissonette","ocArch":"Risk Taker","dc":"Sherman Rondeau","dcArch":"Zone/Positioning"},"Fair Haven Tycoons":{"hc":"John Franklin","hcArch":"The Tactician","hcComp":61,"hcDev":73,"oc":"David Carmichael","ocArch":"Up-Tempo","dc":"Kyle Easton","dcArch":"Penalty Kill Specialist"},"Charlotte Navigators":{"hc":"Skyewalker Nolett","hcArch":"The Firebrand","hcComp":82,"hcDev":31,"oc":"Robbie Hill","ocArch":"Possession-Based","dc":"Sidney Bartlett","dcArch":"Zone/Positioning"},"Shelburne Reapers":{"hc":"Ethan Baxter","hcArch":"The Players Coach","hcComp":86,"hcDev":83,"oc":"Jason Freeman","ocArch":"Up-Tempo","dc":"Brennan Hill","dcArch":"Zone/Positioning"},"Middlebury RiverWolves":{"hc":"Remi Tremblay","hcArch":"The Firebrand","hcComp":72,"hcDev":80,"oc":"Remi Jocks","ocArch":"Up-Tempo","dc":"Alvin Burnett","dcArch":"Pressure-Based"},"Jay StormKings":{"hc":"Finn Colby","hcArch":"The Players Coach","hcComp":83,"hcDev":60,"oc":"Tucker Dudley","ocArch":"Special Teams Specialist","dc":"Archie Hamilton","dcArch":"Zone/Positioning"},"Saint Johnsbury Dinos":{"hc":"Cory Donnelly","hcArch":"The Veteran Whisperer","hcComp":59,"hcDev":25,"oc":"Walter Frost","ocArch":"Possession-Based","dc":"Floyd Dubois","dcArch":"Zone/Positioning"},"Enosburg Owls":{"hc":"Ollie Cromwell","hcArch":"The Tactician","hcComp":59,"hcDev":73,"oc":"Axel Duffy","ocArch":"Up-Tempo","dc":"Connor Marsh","dcArch":"Zone/Positioning"},"Newport Spirits":{"hc":"Sebastian Rousseau","hcArch":"The Veteran Whisperer","hcComp":52,"hcDev":54,"oc":"Jasper Baker","ocArch":"Special Teams Specialist","dc":"Cyrus Sunday","dcArch":"Pressure-Based"},"Stowe Smugglers":{"hc":"Vincent Archer","hcArch":"The Tactician","hcComp":95,"hcDev":67,"oc":"Philippe Fenwick","ocArch":"Possession-Based","dc":"Pablo Barrett","dcArch":"Zone/Positioning"},"Rutland Cryptids":{"hc":"Kelly Okafor","hcArch":"The Veteran Whisperer","hcComp":76,"hcDev":59,"oc":"Kelly Gaines","ocArch":"Possession-Based","dc":"Ty Colburn","dcArch":"Penalty Kill Specialist"},"Barre Carvers":{"hc":"Walker Freeman","hcArch":"The Players Coach","hcComp":69,"hcDev":36,"oc":"Roosevelt Matthews","ocArch":"Possession-Based","dc":"Bryce Hale","dcArch":"Pressure-Based"},"Montpelier Congress":{"hc":"Alan Charbonneau","hcArch":"The Builder","hcComp":69,"hcDev":60,"oc":"Trace Fontaine","ocArch":"Possession-Based","dc":"Demetrius Burnett","dcArch":"Zone/Positioning"},"Ludlow Shepherds":{"hc":"Matt Dempsey","hcArch":"The Tactician","hcComp":78,"hcDev":62,"oc":"Dominic Winfield","ocArch":"Risk Taker","dc":"Rick Lockhart","dcArch":"Zone/Positioning"},"Windsor Independents":{"hc":"Darnell Printup","hcArch":"The Players Coach","hcComp":75,"hcDev":67,"oc":"Blaine Rousseau","ocArch":"Possession-Based","dc":"Jeffrey Hale","dcArch":"Pressure-Based"},"Woodstock Boilers":{"hc":"Kelly Donnelly","hcArch":"The Firebrand","hcComp":52,"hcDev":47,"oc":"Elliott Portneuf","ocArch":"Risk Taker","dc":"Easton Carroll","dcArch":"Zone/Positioning"},"Springfield Hardshells":{"hc":"Mike Atwater","hcArch":"The Players Coach","hcComp":74,"hcDev":62,"oc":"Otsi Granger","ocArch":"Possession-Based","dc":"Wayne Holden","dcArch":"Zone/Positioning"},"Hartford Rampage":{"hc":"Harlan Garrison","hcArch":"The Builder","hcComp":79,"hcDev":85,"oc":"Phil Gilliam","ocArch":"Possession-Based","dc":"Ruben Chase","dcArch":"Zone/Positioning"},"Brattleboro Pioneers":{"hc":"Kaleb Hamilton","hcArch":"The Players Coach","hcComp":68,"hcDev":54,"oc":"Dale Booker","ocArch":"Up-Tempo","dc":"Ivan Fitzgerald","dcArch":"Zone/Positioning"},"Manchester Black Bears":{"hc":"Brennan Gilliam","hcArch":"The Veteran Whisperer","hcComp":76,"hcDev":30,"oc":"Bernard Townsend","ocArch":"Possession-Based","dc":"Silas Allen","dcArch":"Pressure-Based"},"Bennington Prowlers":{"hc":"Otis Adams","hcArch":"The Builder","hcComp":79,"hcDev":70,"oc":"Sean Mason","ocArch":"Possession-Based","dc":"Roy Farrell","dcArch":"Zone/Positioning"}}};

const TEAMS = RAW_DATA.teams;
const PLAYERS_RAW = RAW_DATA.players;
const COACHES = RAW_DATA.coaches;
const TEAM_NAMES = Object.keys(TEAMS);

/* ---------- Name pools for offseason generation (draft prospects, new coaches) ---------- */
const NAME_POOL_FIRST = ["Aaron","Abe","Abel","Adam","Adrian","Aiden","AJ","Alan","Albert","Alden","Alec","Alex","Alexander","Alfie","Alvin","Andre","Andrew","Andy","Angelo","Anthony","Antoine","Antonio","Archer","Archie","Armand","Arthur","Asa","Asher","Ashton","August","Austin","Avery","Axel","Barrett","Barry","Bart","Beau","Beckett","Ben","Benjamin","Bennett","Benny","Bernard","Bill","Billy","Blaine","Blake","Bo","Bobby","Boone","Brad","Braden","Bradley","Brady","Brandon","Brant","Braxton","Brendan","Brennan","Brent","Brett","Brian","Brice","Brock","Brody","Brooks","Bruce","Bryan","Bryant","Bryce","Byron","Cade","Caleb","Calvin","Cam","Camden","Cameron","Carl","Carlos","Carson","Carter","Case","Casey","Cash","Cassius","Cedric","Chad","Chandler","Charles","Charlie","Chase","Chester","Chris","Christian","Christopher","Clark","Clay","Clayton","Clifford","Clint","Clinton","Cody","Colby","Cole","Colin","Colt","Colton","Conner","Connor","Conrad","Cooper","Corey","Cornelius","Cory","Craig","Cruz","Cullen","Curt","Curtis","Cyrus","Dale","Dallas","Dalton","Damian","Damon","Dan","Dana","Dane","Daniel","Danny","Dante","Darnell","Darren","Darryl","Dave","David","Davis","Dawson","Dean","Declan","Demetrius","Dennis","Derek","Derrick","Desmond","Devin","Dexter","Dillon","Dominic","Dominick","Don","Donald","Donnie","Donovan","Doug","Douglas","Drake","Drew","Duane","Duke","Duncan","Dustin","Dwayne","Dwight","Dylan","Earl","Easton","Ed","Eddie","Edgar","Edwin","Eli","Elias","Elijah","Elliot","Elliott","Ellis","Emerson","Emmett","Enzo","Eric","Erik","Ernest","Ethan","Eugene","Evan","Everett","Ezra","Felix","Finn","Fletcher","Floyd","Ford","Forrest","Francis","Frank","Frankie","Franklin","Fred","Freddie","Frederick","Gabe","Gabriel","Gage","Garrett","Garrison","Gary","Gavin","Gene","Geoffrey","George","Gerald","Gideon","Gil","Gilbert","Glen","Glenn","Gordon","Grady","Graham","Grant","Grayson","Greg","Gregory","Griffin","Gus","Hank","Hans","Harlan","Harley","Harold","Harrison","Harry","Harvey","Hayden","Heath","Hector","Henry","Herb","Holden","Homer","Howard","Hudson","Hugh","Hugo","Hunter","Ian","Ike","Ira","Irving","Isaac","Isaiah","Ivan","Jace","Jack","Jackson","Jacob","Jake","Jamie","Jared","Jarrett","Jason","Jasper","Jax","Jaxon","Jay","Jeff","Jefferson","Jeffrey","Jeremiah","Jeremy","Jerome","Jerry","Jesse","Jim","Jimmy","Joe","Joel","Joey","John","Johnny","Jon","Jonah","Jonas","Jonathan","Jordan","Jorge","Joseph","Josh","Joshua","Josiah","Juan","Judd","Jude","Julian","Julius","Justin","Kai","Kaleb","Kane","Karl","Kasey","Keaton","Keegan","Keith","Kellan","Kellen","Kelly","Kelvin","Ken","Kennedy","Kenneth","Kenny","Kent","Kevin","Kieran","Kirk","Knox","Kobe","Kody","Kurt","Kyle","Kyler","Lance","Landon","Lane","Larry","Lars","Lawrence","Lee","Leland","Lenny","Leo","Leon","Leonard","Leroy","Levi","Lewis","Liam","Lincoln","Lionel","Lloyd","Logan","Lonnie","Lorenzo","Louis","Luca","Lucas","Luke","Luther","Lyle","Mack","Malachi","Malcolm","Marco","Mario","Mark","Marlon","Marshall","Martin","Marvin","Mason","Matt","Matthew","Maurice","Max","Maxwell","Melvin","Micah","Michael","Micky","Miguel","Mike","Miles","Milo","Mitch","Mitchell","Monte","Morgan","Morris","Moses","Myles","Nate","Nathan","Nathaniel","Neal","Ned","Neil","Nelson","Nick","Nicholas","Nico","Nigel","Noah","Noel","Nolan","Norman","Oakley","Oliver","Ollie","Omar","Orion","Orlando","Oscar","Otis","Otto","Owen","Pablo","Parker","Pat","Patrick","Paul","Pedro","Percy","Perry","Pete","Peter","Phil","Philip","Phillip","Pierce","Porter","Preston","Quentin","Quinn","Rafael","Ralph","Ramon","Randall","Randy","Ray","Raymond","Reed","Reese","Reggie","Reginald","Reid","Reuben","Rex","Rhett","Ricardo","Rich","Richard","Rick","Ricky","Riley","Rob","Robert","Robbie","Rocco","Rocky","Rod","Rodney","Roger","Roland","Roman","Ron","Ronald","Ronnie","Roosevelt","Rory","Ross","Rowan","Roy","Royce","Ruben","Rudy","Russ","Russell","Rusty","Ryan","Ryder","Rylan","Sam","Sammy","Samuel","Santiago","Sawyer","Scott","Sean","Sebastian","Sergio","Seth","Shane","Shannon","Shaun","Shawn","Sheldon","Sherman","Sidney","Silas","Simon","Sky","Skyler","Solomon","Sonny","Spencer","Stan","Stanley","Stefan","Stephen","Sterling","Steve","Steven","Stewart","Stuart","Sylvester","Tanner","Tate","Taylor","Ted","Teddy","Terrance","Terrence","Terry","Thad","Thaddeus","Theo","Theodore","Thomas","Tim","Timothy","Titus","Tobias","Toby","Todd","Tom","Tommy","Tony","Trace","Travis","Trent","Trenton","Trevor","Trey","Tristan","Troy","Tucker","Ty","Tyler","Tyson","Vance","Vaughn","Vernon","Victor","Vince","Vincent","Virgil","Wade","Walker","Wallace","Walt","Walter","Warren","Waylon","Wayne","Wendell","Wes","Wesley","Weston","Will","Willem","William","Willie","Wilson","Winston","Wyatt","Zach","Zachary","Zack","Zane","Zeke","Luc","Marc","Rene","Theo","Jules","Henri","Emile","Gaston","Andre","Pascal","Benoit","Mathieu","Philippe","Sebastien","Etienne","Gilles","Armand","Claude","Damien","Laurent","Remi","Xavier","Yves","Francois","Alain","Denis","Darius","Marcus","Malik","Jaylen","Kendall","Deon","Treyvon","Isaiah","Jordan","Devon","Elijah","Quincy","Rashad","Terrell","Jabari","Kofi","Andre","Dominic","Brennan","Miles","Xavier","Trey","DeShawn","Jamal","Damien","Waban","Mahigan","Koda","Chogan","Mika","Takoda","Chayton","Kohana","Kanen","Aiyana","Skyewalker","Tehon","Deka","Sokoki","Onatah","Sewatis","Ratsi","Otsi","Wapi","Nodin","Ahanu","Wematin","Enapay","Mato","Ohanzee","Elan","Kitchi"];
const NAME_POOL_LAST = ["Abbott","Adams","Alcott","Aldrich","Allen","Anderson","Archer","Armstrong","Ashford","Atkins","Atwater","Bailey","Baker","Baldwin","Bancroft","Barker","Barlow","Barnes","Barrett","Bartlett","Baxter","Beckett","Bennett","Bishop","Blackwell","Blair","Bowen","Boyd","Bradford","Bradley","Brennan","Brewer","Bridges","Brigham","Brooks","Buchanan","Burgess","Burke","Burnett","Burns","Byers","Calder","Caldwell","Callahan","Cameron","Campbell","Cannon","Carlisle","Carmichael","Carpenter","Carroll","Carver","Chandler","Chapman","Chase","Church","Clark","Clarke","Colburn","Colby","Cole","Coleman","Collins","Compton","Conley","Connolly","Cooper","Corbett","Corrigan","Crawford","Cromwell","Cross","Crowley","Cunningham","Curran","Currier","Curtis","Dalton","Davenport","Dawson","Decker","Dempsey","Dixon","Doherty","Donnelly","Donovan","Doyle","Drake","Dudley","Duffy","Dunbar","Duncan","Dunmore","Easton","Elliott","Ellsworth","Emerson","Everett","Farnsworth","Farrell","Fenwick","Finley","Fitzgerald","Fleming","Fletcher","Flynn","Foley","Forbes","Foster","Fowler","Franklin","Fraser","Freeman","Frost","Fuller","Gallagher","Gardner","Garrison","Gibson","Gilmore","Goodwin","Graham","Granger","Graves","Grayson","Griffin","Griswold","Hale","Hallett","Halloran","Hamilton","Hammond","Hancock","Hardy","Hargrove","Harmon","Harrington","Hastings","Hawkins","Hayes","Hayward","Henderson","Hendricks","Hensley","Higgins","Hobbs","Holbrook","Holden","Hollis","Holmes","Hooper","Hopkins","Horton","Houston","Howard","Hoyt","Hubbard","Hughes","Hutchins","Ingram","Jennings","Kearney","Keating","Kimball","Kingsley","Kirkland","Knight","Lambert","Langley","Langston","Lawson","Leighton","Lockhart","Lowell","Mackenzie","Mahoney","Marlow","Marsh","Mason","Matthews","Archambault","Beauchamp","Beaulieu","Beaumont","Belanger","Bergeron","Bissonette","Blanchard","Bouchard","Boucher","Bourgeois","Brassard","Champagne","Charbonneau","Chevalier","Corriveau","Cote","Couture","Delacroix","Deschamps","Desjardins","Desrosiers","Dubois","Dufresne","Dumont","Duval","Fontaine","Fortin","Gagnon","Gauthier","Girard","Lacroix","Lavoie","Leblanc","Lemieux","Levesque","Marchand","Morin","Ouellet","Paradis","Pelletier","Rondeau","Rousseau","Thibodeau","Tremblay","Abernathy","Asante","Banks","Battle","Bolden","Booker","Boykin","Broadus","Diallo","Dupree","Durant","Freelon","Gaines","Gilliam","Hairston","Haynes","Jefferson","Justice","Kamara","Lattimore","Mays","Mensah","Mercer","Monroe","Moten","Ndiaye","Okafor","Osei","Pettway","Rivers","Sessay","Slaughter","Steele","Sterling","Toussaint","Townsend","Traore","Washington","Winfield","Boots","Brant","Burning","Clause","Deer","Doxtator","Hill","Jocks","Lazore","Lyons","Maracle","Oakes","Porter","Powless","Printup","Shenandoah","Skye","Smoke","Sunday","Tarbell","Annance","Battiste","Gill","Lampman","Lolar","Longtoe","Neptune","Nolett","Obomsawin","Panadis","Portneuf","Watso","Wawanolet"];

const POS_NAME = { A: "Attack", M: "Midfield", L: "Long-Stick Midfield", D: "Defense", F: "FOGO", G: "Goalie" };

// TEAMS/COACHES/PLAYERS_RAW are live references into RAW_DATA, not copies — every offseason
// mutation (progression, contracts, trades, retirement) writes straight through to RAW_DATA
// too. This snapshot is taken here, at module load, before anything has had a chance to
// mutate anything, so "Reset to Year 1" always has a genuinely pristine copy to restore from.
const PRISTINE_YEAR1 = JSON.parse(JSON.stringify({ teams: TEAMS, coaches: COACHES, players: PLAYERS_RAW }));

function playersFor(teamName) {
  return PLAYERS_RAW[teamName].map((p) => ({
    name: p[0], pos: p[1], hand: p[2], age: p[3], ovr: p[4],
    star: !!p[5], leadership: p[6], balance: p[7], durability: p[8],
    aav: p[9] || 0, yearsRemaining: p[10] || 0, contractType: p[11] || "S",
  }));
}

/* ============================================================
   CONTRACTS & SALARY CAP (Master File Section 9)
   Player tuple extended: [...9 base fields, aav, yearsRemaining, contractType]
   Soft cap with tiered overage fines, same structure as the standalone roster docs.
   ============================================================ */
const SALARY_CAP = 2_000_000;
const CONTRACT_TYPES = { ROOKIE: "R", STANDARD: "S", FRANCHISE: "F", JOURNEYMAN: "J" };

function baseSalaryFromOverall(overall) {
  if (overall >= 92) return rand(150000, 220000);
  if (overall >= 88) return rand(100000, 150000);
  if (overall >= 82) return rand(65000, 95000);
  if (overall >= 76) return rand(40000, 60000);
  if (overall >= 70) return rand(25000, 38000);
  if (overall >= 62) return rand(14000, 22000);
  if (overall >= 55) return rand(9000, 14000);
  return rand(6000, 10000);
}

function assignNewContract(p, forceType) {
  // p is the live tuple — mutated in place: [.., aav, yearsRemaining, contractType]
  const ovr = p[4], age = p[3], star = p[5] === 1, leadership = p[6];
  let salary = baseSalaryFromOverall(ovr);
  if (star) salary *= rand(1.20, 1.35);
  if (leadership >= 80) salary *= rand(1.08, 1.13);
  if (age >= 24 && age <= 29) salary *= 1.08;
  if (age >= 33) salary *= age >= 37 ? rand(0.72, 0.82) : rand(0.82, 0.90);
  if (p[1] === "G") salary *= 1.08;
  salary = Math.round(salary / 500) * 500;

  let type = forceType || CONTRACT_TYPES.STANDARD;
  if (!forceType) {
    if (ovr < 55) type = CONTRACT_TYPES.JOURNEYMAN;
    else if (star && ovr >= 88) type = CONTRACT_TYPES.FRANCHISE;
  }
  let length;
  if (type === CONTRACT_TYPES.ROOKIE) length = 3;
  else if (type === CONTRACT_TYPES.JOURNEYMAN) length = 1;
  else if (type === CONTRACT_TYPES.FRANCHISE) length = Math.round(rand(4, 7));
  else length = age <= 24 ? Math.round(rand(2, 5)) : age <= 30 ? Math.round(rand(2, 6)) : age <= 34 ? Math.round(rand(1, 4)) : Math.round(rand(1, 3));

  p[9] = salary;
  p[10] = length;
  p[11] = type;
  return p;
}

function bootstrapContractsIfNeeded() {
  // Year 1 players are embedded without contracts — assign once, first time the league loads.
  for (const teamName of TEAM_NAMES) {
    for (const p of PLAYERS_RAW[teamName]) {
      if (p[9] === undefined) {
        assignNewContract(p);
        p[10] = Math.max(1, Math.round(rand(1, p[10]))); // stagger initial years-remaining so contracts don't all expire simultaneously
      }
    }
  }
}

// One-time migration: introduce Long-Stick Midfield by reclassifying ~2 midfielders per team
// (the position didn't exist when the original 800-player pool was generated).
function migrateLSMIfNeeded() {
  for (const teamName of TEAM_NAMES) {
    const roster = PLAYERS_RAW[teamName];
    if (roster.some((p) => p[1] === "L")) continue; // already migrated
    const midfielders = roster.filter((p) => p[1] === "M");
    // pick the 2 oldest midfielders — reads as "converted to the long pole role later in their career"
    const toConvert = [...midfielders].sort((a, b) => b[3] - a[3]).slice(0, Math.min(2, midfielders.length));
    for (const p of toConvert) p[1] = "L";
  }
}

/* ============================================================
   ROSTER → RATING FEEDBACK LOOP
   Team ratings are no longer fully independent of the roster: each offseason,
   position-group roster quality pulls the relevant subcategories (and overall
   score) toward roster reality. The pull is modest and blended (not an override)
   so the zero-sum tag progression's parity work stays intact — but stacking real
   talent at a position now actually shows up in the numbers, and a gutted position
   group drags a team down. This is what makes drafting, free agency, and trades matter.
   ============================================================ */
const POSITION_GROUP_SUBCATS = {
  A: ["offPos", "offRisk"],
  M: ["offPac", "riding"],
  L: ["defPre", "riding"],   // long-stick midfield: hybrid defensive assignment + transition threat
  D: ["defPos", "defRisk"],
  F: ["fofClm", "fofCon"],
  G: ["glcStp", "glcCon", "glcPas"],
};
const ROSTER_PULL_WEIGHT = 0.14;

function avgOverallByPosition(teamName) {
  const roster = PLAYERS_RAW[teamName];
  const groups = {};
  for (const pos of Object.keys(POSITION_GROUP_SUBCATS)) {
    const players = roster.filter((p) => p[1] === pos);
    groups[pos] = players.length ? players.reduce((s, p) => s + p[4], 0) / players.length : null;
  }
  return groups;
}

function pullRatingsTowardRoster(teamName) {
  const team = TEAMS[teamName];
  const roster = PLAYERS_RAW[teamName];
  if (!roster.length) return;

  const groups = avgOverallByPosition(teamName);
  for (const [pos, subcats] of Object.entries(POSITION_GROUP_SUBCATS)) {
    const avgOvr = groups[pos];
    if (avgOvr == null) continue;
    const target = clamp10((avgOvr - 35) / 64 * 9 + 1);
    for (const key of subcats) team[key] = clamp10(team[key] * (1 - ROSTER_PULL_WEIGHT) + target * ROSTER_PULL_WEIGHT);
  }

  // Pull team.score toward how this roster compares to the LEAGUE-WIDE roster average,
  // translated into score terms. "Player overall" and "team score" were generated on
  // different absolute scales (player averages run systematically higher), so pulling
  // toward the raw roster average would create a steady upward drift league-wide.
  // Pulling toward RELATIVE roster strength avoids that while still rewarding real
  // team-building — a genuinely above-average roster nudges the score up either way.
  const leagueMeanScore = TEAM_NAMES.reduce((s, n) => s + TEAMS[n].score, 0) / TEAM_NAMES.length;
  const leagueMeanRosterOvr = TEAM_NAMES.reduce((s, n) => {
    const r = PLAYERS_RAW[n];
    return s + (r.length ? r.reduce((a, p) => a + p[4], 0) / r.length : 0);
  }, 0) / TEAM_NAMES.length;
  const rosterAvgOvr = roster.reduce((s, p) => s + p[4], 0) / roster.length;
  const impliedScore = leagueMeanScore + (rosterAvgOvr - leagueMeanRosterOvr);
  team.score = Math.max(35, Math.min(99, Math.round(team.score * (1 - ROSTER_PULL_WEIGHT) + impliedScore * ROSTER_PULL_WEIGHT)));
}

function weakestPosition(teamName) {
  const groups = avgOverallByPosition(teamName);
  return Object.entries(groups).sort((a, b) => (a[1] ?? 50) - (b[1] ?? 50))[0][0];
}
function strongestPosition(teamName) {
  const groups = avgOverallByPosition(teamName);
  return Object.entries(groups).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0];
}

/* ---------- Player development (draft picks don't all pan out) ---------- */
function developPlayer(p, coachDev) {
  const age = p[3];
  if (age > 26) return null; // past the organic development window
  const ceiling = p[12] != null ? p[12] : p[4];
  const gap = ceiling - p[4];
  if (Math.abs(gap) < 1) return null;
  const devFactor = (coachDev - 50) / 100;
  const successChance = clamp(0.55 + devFactor * 0.3, 0.20, 0.85);
  const oldOvr = p[4];
  if (Math.random() < successChance) {
    p[4] = clamp(Math.round(p[4] + gap * rand(0.15, 0.35)), 30, 99);
  } else {
    p[4] = clamp(Math.round(p[4] + rand(-2, 0)), 30, 99);
  }
  return p[4] !== oldOvr ? { name: p[0], from: oldOvr, to: p[4], hit: p[4] > oldOvr } : null;
}

function teamPayroll(teamName) {
  return PLAYERS_RAW[teamName].reduce((sum, p) => sum + (p[9] || 0), 0);
}

function capFine(payroll) {
  if (payroll <= SALARY_CAP) return 0;
  const overage = payroll - SALARY_CAP;
  const pctOver = (overage / SALARY_CAP) * 100;
  if (pctOver <= 5) return 0;
  if (pctOver <= 10) return Math.round(overage * 0.25);
  if (pctOver <= 20) return Math.round(overage * 0.50);
  if (pctOver <= 30) return Math.round(overage * 1.00);
  return Math.round(overage * 2.00);
}

/* ---------- MATH HELPERS ---------- */
function gauss(mean = 0, sd = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function formatMoney(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pickWeighted(items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/* ============================================================
   SIMULATION ENGINE (Master File Section 5)
   ============================================================ */

const BALANCE_PCT = { 1: -0.20, 2: -0.16, 3: -0.12, 4: -0.08, 5: 0, 6: 0.04, 7: 0.08, 8: 0.12, 9: 0.16, 10: 0.20 };

function applyBalance(team, isIndoor) {
  if (!isIndoor) return { ...team };
  const pct = BALANCE_PCT[team.bal] ?? 0;
  const adjusted = { ...team };
  for (const key of ["offPos","offPac","offRisk","defPos","defPre","defRisk","glcStp","glcCon","glcPas","pp","pk","clutch","tcon","riding","clearing"]) {
    adjusted[key] = clamp(team[key] * (1 + pct), 1, 10);
  }
  return adjusted; // Faceoff (fofClm/fofCon) exempt per Master File 5.1
}

const TAG_CLUTCH_OT = {
  "Veteran-led": 0.10, "Star Dependent": 0.07, "Deep Roster": 0.05,
  "Rebuilding / Unknown": -0.07, "Young & Inexperienced": -0.10,
};
const TAG_VARIANCE_PCT = {
  "Veteran-led": -0.15, "Star Dependent": 0.20, "Deep Roster": -0.10,
  "Rebuilding / Unknown": 0.20, "Young & Inexperienced": 0.25,
};
const TAG_FATIGUE_PCT = {
  "Veteran-led": 0.25, "Star Dependent": 0.0, "Deep Roster": -0.50,
  "Rebuilding / Unknown": 0.0, "Young & Inexperienced": -0.25,
};

// Which HC archetypes fit which roster tags — a real fit steadies performance,
// a mismatch adds chaos (Master File Section 8: coach/roster fluid influence).
const HC_TAG_FIT = {
  "Veteran-led": ["The Veteran Whisperer", "The Players Coach", "The Tactician"],
  "Star Dependent": ["The Gambler", "The Players Coach", "The Firebrand"],
  "Young & Inexperienced": ["The Builder", "The Firebrand", "The Tactician"],
  "Rebuilding / Unknown": ["The Builder", "The Gambler", "The Tactician"],
  "Deep Roster": ["The Tactician", "The Players Coach", "The Veteran Whisperer"],
};

// Head Coach/GM Competence now has a real, modest, persistent effect on team quality
// (roster construction) and archetype fit affects game-to-game steadiness.
function coachEffect(teamName) {
  const c = COACHES[teamName];
  const team = TEAMS[teamName];
  if (!c) return { qualityBonus: 0, varianceMult: 1 };
  const qualityBonus = (c.hcComp - 60) / 40; // roughly -1 to +1 on the 1-10 subcat scale
  const fits = HC_TAG_FIT[team.tag] || [];
  const varianceMult = fits.includes(c.hcArch) ? 0.90 : 1.12;
  return { qualityBonus, varianceMult };
}

const SUBCATS_TO_VARY = ["offPos","offPac","offRisk","defPos","defPre","defRisk",
                         "fofClm","fofCon","glcStp","glcCon","glcPas","pp","pk","riding","clearing"];

function gameDayTeam(team, tag, isFatigued, teamName) {
  const consistency = team.tcon;
  const baseSD = (10 - consistency) / 10 * 3.6 + 1.2;
  const tagMult = 1 + (TAG_VARIANCE_PCT[tag] || 0);
  const fatigueMult = isFatigued ? 1.10 : 1.0;
  const { qualityBonus, varianceMult } = teamName ? coachEffect(teamName) : { qualityBonus: 0, varianceMult: 1 };
  const sd = baseSD * tagMult * fatigueMult * varianceMult;

  const effective = { ...team };
  for (const key of SUBCATS_TO_VARY) {
    effective[key] = clamp(team[key] + gauss(0, sd), 1, 10);
  }
  // persistent coaching quality nudge — steady across every game, unlike the random noise above
  effective.offPos = clamp(effective.offPos + qualityBonus, 1, 10);
  effective.defPos = clamp(effective.defPos + qualityBonus, 1, 10);

  if (isFatigued) {
    const fatigueTagMult = 1 + (TAG_FATIGUE_PCT[tag] || 0);
    effective.defPre = clamp(effective.defPre - 0.3 * fatigueTagMult, 1, 10);
    effective.offPac = clamp(effective.offPac - 0.2 * fatigueTagMult, 1, 10);
    effective.riding = clamp(effective.riding - 0.15 * fatigueTagMult, 1, 10);
  }
  return effective;
}

function homeFieldBonus(isIndoor, isHome) {
  // Indoor Q2/Q4 longer road shifts (Master File 5.5) are folded in here as a whole-game
  // average — we simulate one aggregate score rather than four quarters, so the stated
  // per-half bonus (+6 home / -4 away Transition, +5 home Clearing, -15% away Riding)
  // is approximated at half strength across the full game.
  if (!isHome) return isIndoor ? { clutch: -3, transition: -2 - 2 } : { clutch: -2, transition: -1 };
  return isIndoor ? { clutch: 5, transition: 4 + 3 } : { clutch: 3, transition: 2 };
}

function applyIndoorQ2Q4Effect(team, isHome, isIndoor) {
  if (!isIndoor) return team;
  const adjusted = { ...team };
  if (isHome) {
    adjusted.clearing = clamp(adjusted.clearing + 0.25, 1, 10); // +2.5/100 avg (half of +5) home Clearing boost
  } else {
    adjusted.riding = clamp(adjusted.riding * 0.925, 1, 10); // 7.5% avg (half of 15%) road Riding penalty
  }
  return adjusted;
}

function computeTransition(t) {
  return (t.defPre * 0.05 + t.defRisk * 0.05 + t.fofClm * 0.10 + t.offPac * 0.05 +
          t.offRisk * 0.05 + t.riding * 0.30 + t.clearing * 0.30 + t.glcStp * 0.10) * 10;
}
function computeOffense(t) { return (t.offPos * 0.30 + t.offPac * 0.30 + t.pp * 0.20 + t.offRisk * 0.20) * 10; }
function computeDefense(t) { return (t.defPos * 0.30 + t.defPre * 0.30 + t.pk * 0.20 + t.defRisk * 0.20) * 10; }
function computeFaceoff(t) { return (t.fofClm * 0.70 + t.fofCon * 0.30) * 10; }

function simulateTeamScore(team, opponent, isHome, isIndoor) {
  const homeBonus = homeFieldBonus(isIndoor, isHome);
  const offense = computeOffense(team);
  const oppDefense = computeDefense(opponent);
  const baseGoals = 8 + ((offense - oppDefense) / 10);

  const transition = computeTransition(team) + homeBonus.transition;
  const oppTransition = computeTransition(opponent);
  const transitionGoals = (transition - oppTransition) / 15;

  const ridingAdv = ((team.riding * 10 - opponent.clearing * 10) / 25)
                   + ((opponent.offRisk * 10 - team.defRisk * 10) / 30)
                   + ((team.riding * 10 - opponent.glcPas * 10) / 30);

  const faceoff = computeFaceoff(team);
  const oppFaceoff = computeFaceoff(opponent);
  const faceoffBonus = (faceoff - oppFaceoff) / 20;

  const oppPenaltyGen = (opponent.defRisk * 10 * 0.6 + opponent.defPre * 10 * 0.4);
  const ppGoals = (team.pp * 10 * oppPenaltyGen) / 10000;

  const consistency = team.tcon * 10;
  const varianceSD = 1 + (100 - consistency) / 100 * 2.5;
  const variance = gauss(0, varianceSD);

  const score = baseGoals + transitionGoals + ridingAdv + faceoffBonus + ppGoals + variance;
  return { score: Math.max(0, score), breakdown: { baseGoals, transitionGoals, ridingAdv, faceoffBonus, ppGoals, variance } };
}

function simulate2PointCycle(offTeam, defTeam) {
  const offRisk = offTeam.offRisk * 10;
  let attemptChance;
  if (offRisk >= 80) attemptChance = 0.55;
  else if (offRisk >= 60) attemptChance = 0.30;
  else attemptChance = 0.10;
  if (Math.random() > attemptChance) return { attempted: false };

  const conversionScore = (offRisk + (100 - defTeam.glcCon * 10) + (100 - defTeam.defPos * 10) + (100 - defTeam.defPre * 10)) / 4;
  const converted = Math.random() * 100 < conversionScore;
  if (converted) return { attempted: true, converted: true };

  const transitionChance = ((defTeam.tcon * 10) + (defTeam.riding * 10)) / 200;
  const capitalized = Math.random() < transitionChance;
  return { attempted: true, converted: false, capitalized };
}

function simulateOT(homeTeam, awayTeam, homeTag, awayTag) {
  const homeClutch = homeTeam.clutch * 10 + (TAG_CLUTCH_OT[homeTag] || 0) * 100;
  const awayClutch = awayTeam.clutch * 10 + (TAG_CLUTCH_OT[awayTag] || 0) * 100;
  const homeFaceoff = computeFaceoff(homeTeam);
  const awayFaceoff = computeFaceoff(awayTeam);
  const homeProb = 0.5 + (homeClutch - awayClutch) / 1000
                  + (homeFaceoff - awayFaceoff) / 2000
                  + (100 - awayTeam.glcCon * 10) / 1000
                  + 0.03;
  let periods = 1;
  while (periods < 8) {
    if (Math.random() < clamp(homeProb, 0.15, 0.85)) return { winner: "home", periods };
    periods++;
    if (Math.random() >= clamp(homeProb, 0.15, 0.85)) return { winner: "away", periods };
  }
  return { winner: Math.random() < 0.5 ? "home" : "away", periods };
}

/* ---------- Injury check (Master File 5.7) ---------- */
function checkInjury(team, tag, isIndoor, isFatigued) {
  let base = 0.04;
  base += (team.offRisk - 5) * 0.003;
  base += (team.defRisk - 5) * 0.002;
  base += (team.defPre - 5) * 0.002;
  if (isIndoor) base += 0.01;
  if (isFatigued) base += 0.015;
  if (tag === "Deep Roster") base *= 0.7;
  if (Math.random() > clamp(base, 0.01, 0.15)) return null;

  const roll = Math.random();
  let severity;
  if (roll < 0.60) severity = "Minor";
  else if (roll < 0.85) severity = "Moderate";
  else if (roll < 0.97) severity = "Significant";
  else severity = "Season-Ending";
  return severity;
}

/* ---------- Full Game Simulation ---------- */
function simulateGame(homeTeamName, awayTeamName, isIndoor, homeFatigued = false, awayFatigued = false) {
  const homeRaw = TEAMS[homeTeamName];
  const awayRaw = TEAMS[awayTeamName];

  const homeBalanced = applyBalance(homeRaw, isIndoor);
  const awayBalanced = applyBalance(awayRaw, isIndoor);

  const home = applyIndoorQ2Q4Effect(gameDayTeam(homeBalanced, homeRaw.tag, homeFatigued, homeTeamName), true, isIndoor);
  const away = applyIndoorQ2Q4Effect(gameDayTeam(awayBalanced, awayRaw.tag, awayFatigued, awayTeamName), false, isIndoor);

  const homeResult = simulateTeamScore(home, away, true, isIndoor);
  const awayResult = simulateTeamScore(away, home, false, isIndoor);

  const home2pt = simulate2PointCycle(home, away);
  const away2pt = simulate2PointCycle(away, home);

  let homeScore = Math.round(homeResult.score);
  let awayScore = Math.round(awayResult.score);
  let homeTwoPointGoal = false, awayTwoPointGoal = false;

  if (home2pt.attempted) {
    if (home2pt.converted) { homeScore += 1; homeTwoPointGoal = true; }
    else if (home2pt.capitalized) awayScore += 1;
  }
  if (away2pt.attempted) {
    if (away2pt.converted) { awayScore += 1; awayTwoPointGoal = true; }
    else if (away2pt.capitalized) homeScore += 1;
  }

  homeScore = Math.max(0, homeScore);
  awayScore = Math.max(0, awayScore);

  let ot = null;
  if (homeScore === awayScore) {
    ot = simulateOT(home, away, homeRaw.tag, awayRaw.tag);
    if (ot.winner === "home") homeScore += 1; else awayScore += 1;
  }

  const homeInjury = checkInjury(home, homeRaw.tag, isIndoor, homeFatigued);
  const awayInjury = checkInjury(away, awayRaw.tag, isIndoor, awayFatigued);

  return {
    homeTeam: homeTeamName, awayTeam: awayTeamName, homeScore, awayScore, ot,
    isIndoor, homeTwoPointGoal, awayTwoPointGoal,
    homeInjury, awayInjury,
    homeFatigued, awayFatigued,
  };
}

/* ---------- Box Score / Scoring Attribution ---------- */
const SCORER_WEIGHT = { A: 3.0, M: 2.0, L: 0.8, D: 0.4, F: 0.25, G: 0.02 };

function attributeGoals(teamName, goalCount, hasTwoPointGoal) {
  const roster = playersFor(teamName);
  const eligible = roster.filter((p) => p.pos !== "G" || Math.random() < 0.02);
  const scorers = [];
  for (let i = 0; i < goalCount; i++) {
    const isTwoPoint = hasTwoPointGoal && i === goalCount - 1;
    const pool = isTwoPoint ? eligible.filter((p) => p.pos === "A" || p.pos === "M") : eligible;
    const scorer = pickWeighted(pool.length ? pool : eligible, (p) =>
      (SCORER_WEIGHT[p.pos] || 0.3) * (p.ovr / 60) * (p.star ? 1.4 : 1)
    );
    let assist = null;
    if (Math.random() < 0.82) {
      const assistPool = eligible.filter((p) => p.name !== scorer.name);
      if (assistPool.length) {
        assist = pickWeighted(assistPool, (p) =>
          (SCORER_WEIGHT[p.pos] || 0.3) * (p.ovr / 60) * (p.star ? 1.3 : 1)
        );
      }
    }
    scorers.push({ scorer: scorer.name, pos: scorer.pos, assist: assist ? assist.name : null, twoPoint: isTwoPoint });
  }
  return scorers;
}

/* ============================================================
   SCHEDULE GENERATION (Master File Section 1.4, 15)
   ============================================================ */

function groupBy(keyFn) {
  const groups = {};
  for (const name of TEAM_NAMES) {
    const key = keyFn(TEAMS[name]);
    if (!groups[key]) groups[key] = [];
    groups[key].push(name);
  }
  return groups;
}
const BY_DIVISION = groupBy((t) => `${t.conf}|${t.div}`);
const BY_REGION = groupBy((t) => `${t.conf}|${t.region}`);
const BY_CONFERENCE = groupBy((t) => t.conf);

let gameIdCounter = 0;
function makePairing(teamA, teamB, type) {
  return { id: gameIdCounter++, teamA, teamB, type, home: null, away: null, week: null };
}

function buildSeasonPairings() {
  const pairings = [];
  for (const div of Object.values(BY_DIVISION)) {
    for (let i = 0; i < div.length; i++)
      for (let j = i + 1; j < div.length; j++) {
        pairings.push(makePairing(div[i], div[j], "division"));
        pairings.push(makePairing(div[i], div[j], "division"));
      }
  }
  for (const regionTeams of Object.values(BY_REGION)) {
    const divs = [...new Set(regionTeams.map((t) => TEAMS[t].div))];
    const groupA = regionTeams.filter((t) => TEAMS[t].div === divs[0]);
    const groupB = regionTeams.filter((t) => TEAMS[t].div === divs[1]);
    for (const a of groupA) for (const b of groupB) pairings.push(makePairing(a, b, "region"));
  }
  for (const confTeams of Object.values(BY_CONFERENCE)) {
    const regions = [...new Set(confTeams.map((t) => TEAMS[t].region))];
    const regionA = confTeams.filter((t) => TEAMS[t].region === regions[0]);
    const regionB = confTeams.filter((t) => TEAMS[t].region === regions[1]);
    for (let i = 0; i < regionA.length; i++)
      for (let d = 0; d < 4; d++) {
        const j = (i + d) % regionB.length;
        pairings.push(makePairing(regionA[i], regionB[j], "conference"));
      }
  }
  const lakeshore = TEAM_NAMES.filter((t) => TEAMS[t].conf === "Lake");
  const mountainside = TEAM_NAMES.filter((t) => TEAMS[t].conf === "Moun");
  for (let i = 0; i < lakeshore.length; i++)
    for (let d = 0; d < 2; d++) {
      const j = (i + d) % mountainside.length;
      pairings.push(makePairing(lakeshore[i], mountainside[j], "interconference"));
    }
  return pairings;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============================================================
   TRADES — autonomous engine + manual override support
   ============================================================ */
function playerTradeValue(p) {
  const age = p[3], ovr = p[4], aav = p[9] || 10000;
  let value = ovr * 10;
  if (age <= 24) value *= 1.25;
  else if (age >= 33) value *= 0.7;
  const efficiency = ovr / Math.max(1, aav / 10000);
  value *= clamp(efficiency / 8, 0.7, 1.3);
  return Math.round(value);
}

// Stars on losing teams or clashing with a mismatched coach get frustrated and may
// formally request a trade — the engine prioritizes moving them first.
function identifyUnhappyStars(standingsMap) {
  const unhappy = [];
  for (const team of TEAM_NAMES) {
    const entry = standingsMap[team];
    const winPct = entry ? entry.w / (entry.w + entry.l + entry.otl || 1) : 0.5;
    const coach = COACHES[team];
    const teamTag = TEAMS[team].tag;
    const mismatch = coach && !(HC_TAG_FIT[teamTag] || []).includes(coach.hcArch);
    const stars = PLAYERS_RAW[team].filter((p) => p[5] === 1);
    for (const star of stars) {
      let demandChance = 0;
      let reason = null;
      if (winPct < 0.35) { demandChance += 0.30; reason = "losing situation"; }
      if (mismatch) { demandChance += 0.15; reason = reason || "clashing with the coaching staff"; }
      if (star[3] >= 30 && winPct < 0.40) demandChance += 0.10;
      if (demandChance > 0 && Math.random() < demandChance) {
        unhappy.push({ team, player: star, reason: reason || "wants a fresh start" });
      }
    }
  }
  return unhappy;
}

function bestTradeCandidateAtPosition(team, pos, exclude) {
  const roster = PLAYERS_RAW[team].filter((p) => p[1] === pos && !exclude.has(p[0]));
  if (!roster.length) return null;
  return [...roster].sort((a, b) => b[4] - a[4])[0];
}

function executeTrade(teamA, teamB, playerA, playerB) {
  const rosterA = PLAYERS_RAW[teamA], rosterB = PLAYERS_RAW[teamB];
  const idxA = rosterA.indexOf(playerA), idxB = rosterB.indexOf(playerB);
  if (idxA === -1 || idxB === -1) return false;
  rosterA.splice(idxA, 1);
  rosterB.splice(idxB, 1);
  rosterA.push(playerB);
  rosterB.push(playerA);
  return true;
}

function runTradeEngine(standingsMap) {
  const trades = [];
  const tradedNames = new Set();
  const tradesThisCycle = {};
  for (const t of TEAM_NAMES) tradesThisCycle[t] = 0;
  const MAX_TRADES_PER_TEAM = 2;

  // 1. Unhappy stars get moved first
  const unhappy = identifyUnhappyStars(standingsMap);
  for (const u of unhappy) {
    if (tradedNames.has(u.player[0])) continue;
    if (tradesThisCycle[u.team] >= MAX_TRADES_PER_TEAM) continue;
    const pos = u.player[1];
    const candidates = TEAM_NAMES.filter((t) => t !== u.team && tradesThisCycle[t] < MAX_TRADES_PER_TEAM).map((t) => {
      const room = SALARY_CAP - teamPayroll(t);
      const posAvg = avgOverallByPosition(t)[pos];
      const needScore = posAvg == null ? 60 : Math.max(0, 100 - posAvg);
      return { t, room, needScore };
    }).filter((x) => x.room > (u.player[9] || 10000) * 0.8)
      .sort((a, b) => b.needScore - a.needScore);
    if (!candidates.length) continue;
    const destTeam = candidates[0].t;
    const requestingWeak = weakestPosition(u.team);
    const returnPlayer = bestTradeCandidateAtPosition(destTeam, requestingWeak, tradedNames)
      || bestTradeCandidateAtPosition(destTeam, strongestPosition(destTeam), tradedNames);
    if (!returnPlayer || returnPlayer[0] === u.player[0]) continue;
    if (executeTrade(u.team, destTeam, u.player, returnPlayer)) {
      tradedNames.add(u.player[0]); tradedNames.add(returnPlayer[0]);
      tradesThisCycle[u.team]++; tradesThisCycle[destTeam]++;
      trades.push({
        teamA: u.team, teamB: destTeam, playerA: u.player[0], playerB: returnPlayer[0],
        valueA: playerTradeValue(u.player), valueB: playerTradeValue(returnPlayer),
        reason: `${u.player[0]} requested a trade — ${u.reason}`,
      });
    }
  }

  // 2. General complementary need/surplus matching across the rest of the league
  const teamsShuffled = shuffle(TEAM_NAMES);
  for (const teamA of teamsShuffled) {
    if (tradesThisCycle[teamA] >= MAX_TRADES_PER_TEAM) continue;
    if (Math.random() > 0.35) continue; // not every team is active in the market every year
    const weakA = weakestPosition(teamA);
    const strongA = strongestPosition(teamA);
    for (const teamB of teamsShuffled) {
      if (teamB === teamA || tradesThisCycle[teamB] >= MAX_TRADES_PER_TEAM) continue;
      const weakB = weakestPosition(teamB);
      const strongB = strongestPosition(teamB);
      if (strongB === weakA && strongA === weakB) {
        const playerFromA = bestTradeCandidateAtPosition(teamA, strongA, tradedNames);
        const playerFromB = bestTradeCandidateAtPosition(teamB, strongB, tradedNames);
        if (!playerFromA || !playerFromB) continue;
        const valA = playerTradeValue(playerFromA), valB = playerTradeValue(playerFromB);
        if (Math.abs(valA - valB) / Math.max(valA, valB) < 0.25) {
          if (executeTrade(teamA, teamB, playerFromA, playerFromB)) {
            tradedNames.add(playerFromA[0]); tradedNames.add(playerFromB[0]);
            tradesThisCycle[teamA]++; tradesThisCycle[teamB]++;
            trades.push({ teamA, teamB, playerA: playerFromA[0], playerB: playerFromB[0], valueA: valA, valueB: valB, reason: "complementary roster needs" });
          }
          break;
        }
      }
    }
  }
  return trades;
}

function assignHomeAway(pairings) {
  const homeCounts = {};
  for (const name of TEAM_NAMES) homeCounts[name] = 0;
  const order = shuffle(pairings);
  for (const g of order) {
    const aHome = homeCounts[g.teamA], bHome = homeCounts[g.teamB];
    if (aHome < bHome) { g.home = g.teamA; g.away = g.teamB; }
    else if (bHome < aHome) { g.home = g.teamB; g.away = g.teamA; }
    else if (Math.random() < 0.5) { g.home = g.teamA; g.away = g.teamB; }
    else { g.home = g.teamB; g.away = g.teamA; }
    homeCounts[g.home]++;
  }
  return pairings;
}

function maxImbalanceOf(games) {
  const counts = {};
  for (const name of TEAM_NAMES) counts[name] = { home: 0, away: 0 };
  for (const g of games) { counts[g.home].home++; counts[g.away].away++; }
  return Math.max(...Object.values(counts).map((c) => Math.abs(c.home - c.away)));
}

function buildBalancedPairings() {
  const pairings = buildSeasonPairings();
  let best = null, bestImb = Infinity;
  for (let attempt = 0; attempt < 25; attempt++) {
    const trial = assignHomeAway(pairings.map((g) => ({ ...g, home: null, away: null })));
    const imb = maxImbalanceOf(trial);
    if (imb < bestImb) { bestImb = imb; best = trial; }
    if (bestImb <= 2) break;
  }
  return best;
}

function assignWeeks(games) {
  const teamWeekCount = {};
  for (const name of TEAM_NAMES) teamWeekCount[name] = new Array(14).fill(0);
  function bump(team, week) { teamWeekCount[team][week]++; }

  const interGames = games.filter((g) => g.type === "interconference");
  const assignedInterTeams = new Set();
  for (const g of interGames) {
    const aFree7 = !assignedInterTeams.has(g.teamA + "_7");
    const bFree7 = !assignedInterTeams.has(g.teamB + "_7");
    if (aFree7 && bFree7) { g.week = 7; assignedInterTeams.add(g.teamA + "_7"); assignedInterTeams.add(g.teamB + "_7"); }
    else { g.week = 12; assignedInterTeams.add(g.teamA + "_12"); assignedInterTeams.add(g.teamB + "_12"); }
    bump(g.teamA, g.week); bump(g.teamB, g.week);
  }

  for (const div of Object.values(BY_DIVISION)) {
    const divGames = games.filter((g) => g.type === "division" && div.includes(g.teamA) && div.includes(g.teamB));
    const pairKey = (g) => [g.teamA, g.teamB].sort().join("|");
    const byPair = {};
    for (const g of divGames) { const k = pairKey(g); (byPair[k] = byPair[k] || []).push(g); }
    const [W, X, Y, Z] = div;
    for (const [t1, t2] of [[W, X], [Y, Z]]) {
      const k = [t1, t2].sort().join("|");
      const cand = byPair[k];
      if (cand && cand.length) { cand[0].week = 13; bump(cand[0].teamA, 13); bump(cand[0].teamB, 13); }
    }
  }

  const remainingWeeks = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11];
  const remainingGames = shuffle(games.filter((g) => g.week === null));
  for (const g of remainingGames) {
    let bestWeek = null, bestScore = Infinity;
    for (const w of remainingWeeks) {
      const aCount = teamWeekCount[g.teamA][w], bCount = teamWeekCount[g.teamB][w];
      if (aCount >= 2 || bCount >= 2) continue;
      const score = aCount + bCount;
      if (score < bestScore) { bestScore = score; bestWeek = w; }
    }
    if (bestWeek === null) {
      bestWeek = remainingWeeks.reduce((min, w) =>
        teamWeekCount[g.teamA][w] + teamWeekCount[g.teamB][w] < teamWeekCount[g.teamA][min] + teamWeekCount[g.teamB][min] ? w : min,
      remainingWeeks[0]);
    }
    g.week = bestWeek;
    bump(g.teamA, bestWeek); bump(g.teamB, bestWeek);
  }
  return games;
}

function generateFullSchedule() {
  gameIdCounter = 0;
  const pairings = buildBalancedPairings();
  return assignWeeks(pairings).sort((a, b) => a.week - b.week);
}

/* ============================================================
   STANDINGS
   ============================================================ */
function computeStandings(schedule, results) {
  const table = {};
  for (const name of TEAM_NAMES) {
    table[name] = { team: name, w: 0, l: 0, otl: 0, points: 0, gf: 0, ga: 0, gd: 0, gamesPlayed: 0 };
  }
  for (const g of schedule) {
    const res = results[g.id];
    if (!res) continue;
    const home = table[g.home], away = table[g.away];
    home.gamesPlayed++; away.gamesPlayed++;
    home.gf += res.homeScore; home.ga += res.awayScore;
    away.gf += res.awayScore; away.ga += res.homeScore;
    if (res.homeScore > res.awayScore) {
      home.w++; home.points += 1;
      if (res.ot) away.otl++; else away.l++;
    } else {
      away.w++; away.points += 1;
      if (res.ot) home.otl++; else home.l++;
    }
  }
  for (const t of Object.values(table)) t.gd = t.gf - t.ga;
  return table;
}

function standingsForGroup(table, teamList) {
  return teamList
    .map((name) => table[name])
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
}

/* ============================================================
   PLAYOFFS (Master File Section 2)
   12 of 16 teams per conference qualify. 4 division winners per conference
   get a bye. Within each region: intra-division #2 vs #3 wildcard game;
   winner faces the OTHER division's bye winner in the Regional Semifinal.
   Regional Final -> Conference Final -> Trophy Final (best of 3).
   Regular season: 1 Commissioners Cup point per win. Playoffs: 2 points per win.
   ============================================================ */

function rankDivision(table, teamList) {
  return [...teamList].sort((a, b) =>
    table[b].points - table[a].points || table[b].gd - table[a].gd || table[b].gf - table[a].gf
  );
}

function betterSeed(table, teamA, teamB) {
  const a = table[teamA], b = table[teamB];
  if (a.points !== b.points) return a.points > b.points ? teamA : teamB;
  if (a.gd !== b.gd) return a.gd > b.gd ? teamA : teamB;
  return a.gf >= b.gf ? teamA : teamB;
}

function buildRegionSeeds(table, regionKey) {
  const regionTeams = BY_REGION[regionKey];
  const divs = [...new Set(regionTeams.map((t) => TEAMS[t].div))];
  const div1Teams = regionTeams.filter((t) => TEAMS[t].div === divs[0]);
  const div2Teams = regionTeams.filter((t) => TEAMS[t].div === divs[1]);
  const div1Ranked = rankDivision(table, div1Teams);
  const div2Ranked = rankDivision(table, div2Teams);
  return {
    regionKey,
    div1: { name: divs[0], winner: div1Ranked[0], seed2: div1Ranked[1], seed3: div1Ranked[2], missed: div1Ranked[3] },
    div2: { name: divs[1], winner: div2Ranked[0], seed2: div2Ranked[1], seed3: div2Ranked[2], missed: div2Ranked[3] },
  };
}

function buildAllSeeds(table) {
  const seeds = {};
  for (const regionKey of Object.keys(BY_REGION)) seeds[regionKey] = buildRegionSeeds(table, regionKey);
  return seeds;
}

let playoffGameId = 0;
function initPlayoffs(table) {
  playoffGameId = 0;
  const seeds = buildAllSeeds(table);
  const wildcard = [];
  for (const regionKey of Object.keys(seeds)) {
    const s = seeds[regionKey];
    // higher seed (division's #2) hosts the wildcard game
    const g1Home = betterSeed(table, s.div1.seed2, s.div1.seed3);
    wildcard.push({ id: playoffGameId++, round: "wildcard", region: regionKey, bracket: s.div1.name,
      home: g1Home, away: g1Home === s.div1.seed2 ? s.div1.seed3 : s.div1.seed2, winner: null, result: null });
    const g2Home = betterSeed(table, s.div2.seed2, s.div2.seed3);
    wildcard.push({ id: playoffGameId++, round: "wildcard", region: regionKey, bracket: s.div2.name,
      home: g2Home, away: g2Home === s.div2.seed2 ? s.div2.seed3 : s.div2.seed2, winner: null, result: null });
  }
  return { seeds, wildcard, regionalSemis: [], regionalFinal: [], conferenceFinal: [], trophyFinal: null, ccBonus: {}, champion: null };
}

function playGame(home, away) {
  const raw = simulateGame(home, away, false); // playoffs stay in the season's format (outdoor Corkum for now)
  return { home, away, homeScore: raw.homeScore, awayScore: raw.awayScore, ot: !!raw.ot,
    winner: raw.homeScore > raw.awayScore ? home : away };
}

function addCC(playoffs, team, pts) {
  playoffs.ccBonus[team] = (playoffs.ccBonus[team] || 0) + pts;
}

function simulateWildcardRound(playoffs) {
  for (const g of playoffs.wildcard) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  for (const regionKey of Object.keys(playoffs.seeds)) {
    const s = playoffs.seeds[regionKey];
    const div1WC = playoffs.wildcard.find((g) => g.region === regionKey && g.bracket === s.div1.name);
    const div2WC = playoffs.wildcard.find((g) => g.region === regionKey && g.bracket === s.div2.name);
    // division winner (bye) always hosts, per Master File "winner plays winner of [other] Division"
    playoffs.regionalSemis.push({ id: playoffGameId++, round: "regionalSemis", region: regionKey, bracket: s.div2.name,
      home: s.div2.winner, away: div1WC.winner, winner: null, result: null });
    playoffs.regionalSemis.push({ id: playoffGameId++, round: "regionalSemis", region: regionKey, bracket: s.div1.name,
      home: s.div1.winner, away: div2WC.winner, winner: null, result: null });
  }
}

function simulateRegionalSemisRound(playoffs, table) {
  for (const g of playoffs.regionalSemis) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  for (const regionKey of Object.keys(playoffs.seeds)) {
    const semis = playoffs.regionalSemis.filter((g) => g.region === regionKey);
    const home = betterSeed(table, semis[0].winner, semis[1].winner);
    const away = home === semis[0].winner ? semis[1].winner : semis[0].winner;
    playoffs.regionalFinal.push({ id: playoffGameId++, round: "regionalFinal", region: regionKey, home, away, winner: null, result: null });
  }
}

function simulateRegionalFinalRound(playoffs, table) {
  for (const g of playoffs.regionalFinal) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  const byConf = {};
  for (const g of playoffs.regionalFinal) {
    const conf = TEAMS[g.winner].conf;
    (byConf[conf] = byConf[conf] || []).push(g.winner);
  }
  for (const conf of Object.keys(byConf)) {
    const [a, b] = byConf[conf];
    const home = betterSeed(table, a, b);
    const away = home === a ? b : a;
    playoffs.conferenceFinal.push({ id: playoffGameId++, round: "conferenceFinal", conference: conf, home, away, winner: null, result: null });
  }
}

function simulateConferenceFinalRound(playoffs, table) {
  for (const g of playoffs.conferenceFinal) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  const [a, b] = playoffs.conferenceFinal.map((g) => g.winner);
  const higherSeed = betterSeed(table, a, b);
  const otherTeam = higherSeed === a ? b : a;
  // Games 1 & 3 hosted by the better regular-season record (stand-in for All-Star Game result, not yet simulated)
  playoffs.trophyFinal = { teamA: higherSeed, teamB: otherTeam, games: [], winner: null, winsA: 0, winsB: 0 };
}

function simulateTrophyFinalSeries(playoffs) {
  const tf = playoffs.trophyFinal;
  const hostOrder = [tf.teamA, tf.teamB, tf.teamA]; // games 1 & 3 hosted by teamA (higher seed)
  let gameNum = 0;
  while (tf.winsA < 2 && tf.winsB < 2 && gameNum < 3) {
    const home = hostOrder[gameNum];
    const away = home === tf.teamA ? tf.teamB : tf.teamA;
    const r = playGame(home, away);
    tf.games.push(r);
    addCC(playoffs, r.winner, 2);
    if (r.winner === tf.teamA) tf.winsA++; else tf.winsB++;
    gameNum++;
  }
  tf.winner = tf.winsA === 2 ? tf.teamA : tf.teamB;
  playoffs.champion = tf.winner;
}

/* ============================================================
   OFFSEASON (Master File Sections 7, 8.5, 9.4)
   Team ratings/tags progress via a simplified season-over-season model since
   full roster-driven ratings aren't wired in yet (Option A — see project notes).
   Draft, coach movement, and retirement operate on real embedded data and
   generate fresh names from the pool for prospects and incoming coaches.
   ============================================================ */
function clamp10(v) { return Math.max(1, Math.min(10, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }

function computeProgressionDelta(team, combinedWinPct, roster) {
  const oldTag = team.tag;
  let delta = 0;
  let newTag = team.tag;
  switch (team.tag) {
    case "Veteran-led": {
      delta = combinedWinPct < 0.5 ? -rand(2, 4) : -rand(1, 2);
      if (combinedWinPct < 0.40) newTag = "Rebuilding / Unknown";
      break;
    }
    case "Star Dependent": {
      const hasYoungStar = roster.some((p) => p[5] === 1 && p[3] < 30);
      delta = hasYoungStar ? rand(2, 5) : -rand(3, 6);
      if (!hasYoungStar && combinedWinPct < 0.45) newTag = "Rebuilding / Unknown";
      else if (team.score >= 86 && Math.random() < 0.35) newTag = "Deep Roster"; // built a real team around the star
      break;
    }
    case "Young & Inexperienced": {
      delta = rand(3, 6) * (combinedWinPct > 0.5 ? 1.15 : 0.85);
      if (team.score >= 80) {
        // the young core matures — growth phase ends
        const hasStar = roster.some((p) => p[5] === 1);
        newTag = hasStar && Math.random() < 0.4 ? "Star Dependent" : "Deep Roster";
      }
      break;
    }
    case "Rebuilding / Unknown": {
      const combinedWins = Math.round(combinedWinPct * 32);
      if (combinedWins >= 18) {
        const skillPlayers = roster.filter((p) => p[1] === "A" || p[1] === "M");
        const attackAvgOvr = skillPlayers.reduce((s, p) => s + p[4], 0) / (skillPlayers.length || 1);
        const hasStar = roster.some((p) => p[5] === 1);
        newTag = hasStar ? "Star Dependent" : attackAvgOvr > 68 ? "Deep Roster" : "Young & Inexperienced";
      }
      delta = rand(-2, 2);
      if (newTag === "Rebuilding / Unknown" && Math.random() < 0.22) newTag = "Young & Inexperienced"; // front office commits to a youth movement
      break;
    }
    case "Deep Roster": {
      delta = rand(-1, 2);
      const r = Math.random();
      if (r < 0.10) newTag = "Rebuilding / Unknown";
      else if (r < 0.25) newTag = "Veteran-led"; // the core is aging together
      break;
    }
  }
  return { rawDelta: delta, newTag, oldTag };
}

/* League-wide zero-sum progression: teams still rise and fall on their tag trajectories,
   but the league's total rating stays level — one team's climb is funded by others' slides.
   A gentle compression term (regression toward the league mean) keeps the top and bottom
   from drifting apart into a permanent divide, while day-to-day stratification remains. */
function applyLeagueProgression(combinedStandingsByTeam) {
  const leagueMean = TEAM_NAMES.reduce((s, n) => s + TEAMS[n].score, 0) / TEAM_NAMES.length;
  const raws = {};
  let deltaSum = 0;
  for (const name of TEAM_NAMES) {
    const entry = combinedStandingsByTeam[name];
    const winPct = entry.w / (entry.w + entry.l + entry.otl || 1);
    const r = computeProgressionDelta(TEAMS[name], winPct, PLAYERS_RAW[name]);
    raws[name] = r;
    deltaSum += r.rawDelta;
  }
  const meanDelta = deltaSum / TEAM_NAMES.length;

  const results = [];
  const developments = [];
  for (const name of TEAM_NAMES) {
    const team = TEAMS[name];
    const { rawDelta, newTag, oldTag } = raws[name];
    const zeroSum = rawDelta - meanDelta;                    // league total stays level
    const compression = (leagueMean - team.score) * 0.09;   // pull toward the middle — reduced since the roster pull below now shares this job
    const delta = zeroSum + compression;
    const oldScore = team.score;
    const tagScore = Math.max(40, Math.min(92, Math.round(team.score + delta)));
    const subcatDelta = (tagScore - oldScore) / 10;
    for (const key of SUBCATS_TO_VARY) team[key] = clamp10(team[key] + subcatDelta);
    team.score = tagScore;
    team.tag = newTag;

    // player development — not every prospect pans out
    const coachDev = COACHES[name]?.hcDev ?? 55;
    for (const p of PLAYERS_RAW[name]) {
      p[3] = (p[3] || 20) + 1; // everyone ages a year in the offseason
      const devResult = developPlayer(p, coachDev);
      if (devResult) developments.push({ team: name, ...devResult });
    }

    // roster quality now pulls the numbers toward reality — this is what makes
    // drafting, free agency, and trades actually matter, not just narrative flavor
    pullRatingsTowardRoster(name);

    const newScore = team.score;
    results.push({ team: name, oldScore, newScore, delta: Math.round((newScore - oldScore) * 10) / 10, tagChanged: newTag !== oldTag, oldTag, newTag });
  }
  return { results, developments };
}

/* ---------- Draft ---------- */
function buildDraftOrder(combinedStandings) {
  const sorted = [...combinedStandings].sort((a, b) => a.points - b.points); // worst first
  const lotteryPool = sorted.slice(0, 16);
  const rest = sorted.slice(16);
  const pool = [...lotteryPool];
  const picks1to8 = [];
  for (let i = 0; i < 8 && pool.length; i++) {
    const weights = pool.map((_, idx) => pool.length - idx);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let chosenIdx = 0;
    for (let j = 0; j < weights.length; j++) { r -= weights[j]; if (r <= 0) { chosenIdx = j; break; } }
    picks1to8.push(pool[chosenIdx].team);
    pool.splice(chosenIdx, 1);
  }
  const picks9to16 = pool.map((t) => t.team);
  const picks17to32 = rest.map((t) => t.team);
  return [...picks1to8, ...picks9to16, ...picks17to32];
}

const DRAFT_POSITIONS = ["A","A","M","M","M","L","L","D","D","F","G"];
function getUniqueName(usedNames) {
  let first, last, full;
  let attempts = 0;
  do {
    first = NAME_POOL_FIRST[Math.floor(Math.random() * NAME_POOL_FIRST.length)];
    last = NAME_POOL_LAST[Math.floor(Math.random() * NAME_POOL_LAST.length)];
    full = `${first} ${last}`;
    attempts++;
  } while ((usedNames.has(full) || first[0].toUpperCase() === last[0].toUpperCase()) && attempts < 300);
  usedNames.add(full);
  return full;
}

function generateProspect(round, usedNames, teamName) {
  // Need-aware: a team drafts for its weakest position group most of the time,
  // but not always — "best player available" logic still wins out sometimes,
  // and even a need-based pick can bust (handled at development time).
  let pos;
  if (teamName && Math.random() < 0.60) {
    pos = weakestPosition(teamName);
  } else {
    pos = DRAFT_POSITIONS[Math.floor(Math.random() * DRAFT_POSITIONS.length)];
  }
  const age = 19 + Math.floor(Math.random() * 4);
  let ovrCenter, ceilCenter;
  if (round === 1) { ovrCenter = 74; ceilCenter = 87; }
  else if (round === 2) { ovrCenter = 66; ceilCenter = 79; }
  else if (round === 3) { ovrCenter = 60; ceilCenter = 73; }
  else if (round === 4) { ovrCenter = 55; ceilCenter = 67; }
  else { ovrCenter = 50; ceilCenter = 62; }
  const overall = Math.max(38, Math.min(92, Math.round(ovrCenter + rand(-9, 9))));
  const ceiling = Math.max(overall, Math.min(99, Math.round(ceilCenter + rand(-7, 10))));
  const hand = Math.random() < 0.62 ? "R" : Math.random() < 0.90 ? "L" : "A";
  return { name: getUniqueName(usedNames), pos, age, overall, ceiling, hand, round };
}

function runDraft(draftOrder, usedNames) {
  const results = [];
  let overallPick = 1;
  for (let round = 1; round <= 5; round++) {
    for (let i = 0; i < draftOrder.length; i++) {
      const team = draftOrder[i];
      const prospect = generateProspect(round, usedNames, team);
      results.push({ overallPick, round, team, prospect });
      overallPick++;
    }
  }
  return results;
}

/* ---------- Coach Movement ---------- */
// A coach now needs sustained struggle to lose their job, not just one bad year —
// tenure=1 (first year on the job) is always safe; firing pressure escalates with
// consecutive bad years, matching the Master File's "3 consecutive losing seasons" spirit.
function evaluateFiring(coachRecord, corkumMadePlayoffs, culkinMadePlayoffs, combinedCupRank, competence) {
  const tenure = coachRecord.hcTenure || 1;
  const priorStruggle = coachRecord.hcStruggleYears || 0;
  if (tenure <= 1) return { fired: false, strugglingYears: 0 };

  const hadBadYear = (!corkumMadePlayoffs && !culkinMadePlayoffs) || combinedCupRank >= 27;
  const strugglingYears = hadBadYear ? priorStruggle + 1 : 0;

  let fireChance = 0.02;
  if (strugglingYears === 1) fireChance += 0.08;
  else if (strugglingYears === 2) fireChance += 0.35;
  else if (strugglingYears >= 3) fireChance += 0.65;
  fireChance -= (competence - 50) / 300;

  const fired = Math.random() < Math.max(0.02, Math.min(0.85, fireChance));
  return { fired, strugglingYears: fired ? 0 : strugglingYears };
}

const HC_ARCHETYPES = ["The Tactician","The Players Coach","The Firebrand","The Builder","The Veteran Whisperer","The Gambler"];
function generateFreshCoach(usedNames) {
  const name = getUniqueName(usedNames);
  const archetype = HC_ARCHETYPES[Math.floor(Math.random() * HC_ARCHETYPES.length)];
  const competence = Math.round(rand(45, 90));
  const development = Math.round(rand(40, 85));
  return { name, archetype, competence, development };
}

/* ---------- Retirement ---------- */
function evaluateRetirement(player) { // [name,pos,hand,age,ovr,star,leadership,balance,durability]
  const age = player[3], durability = player[8], leadership = player[6];
  if (age < 36) return false;
  let chance;
  if (age <= 37) chance = 0.12;
  else if (age <= 39) chance = 0.25;
  else if (age === 40) chance = 0.45;
  else chance = 0.70;
  chance -= (durability - 50) / 400;
  chance -= (leadership - 50) / 500;
  return Math.random() < Math.max(0.03, chance);
}

/* ============================================================
   PRESS BOX — Narrative Layer (Phase 5)
   Generates game recaps and columns via the Anthropic API, in the voice of the
   league's media ecosystem. All content stays inside the fiction: Year N only,
   no real-world references, quotes only from named VPLL coaches and players.
   ============================================================ */
const OUTLET_VOICES = {
  "VPLL.com": "The league's official site. Professional, balanced beat reporting. Focus on what happened and why it matters in the standings. Quotes from both sides. No hot takes.",
  "The Mesh": "The league's analytical outlet. Tactical deep-dives for die-hard fans: transition games, riding pressure, faceoff battles, 2-point shot selection, coaching chess matches. Smart, precise, respectful. Assume the reader knows the league.",
  "The X": "The league's opinion page. A columnist with strong takes and a sharp pen. Calls out underperformers, questions coaching decisions, stokes rivalries, loves the big-market/small-market tension and the resort-town cap violators. Provocative but never cruel.",
  "Hot Stove": "The league's offseason rumor mill and transaction analysis column. Draft grades, coaching carousel gossip, retirement tributes, cap and market speculation. Breathless but informed.",
};

function teamIdentityNotes(team) {
  const notes = [];
  if (team.riding >= 8) notes.push("elite riding/pressure transition game");
  if (team.clearing >= 8) notes.push("clean clearing unit");
  if (team.offRisk >= 8) notes.push("aggressive 2-point-hunting offense");
  if (team.offPac >= 8) notes.push("up-tempo attack");
  if (team.defPre >= 8) notes.push("suffocating pressure defense");
  if (team.defPos >= 8 && team.defPre < 8) notes.push("disciplined positional defense");
  if (team.glcStp >= 8) notes.push("elite goaltending");
  if (team.fofClm >= 8) notes.push("dominant faceoff unit");
  if (team.tcon <= 5) notes.push("notoriously volatile night to night");
  if (team.clutch >= 8) notes.push("proven in close games");
  return notes.slice(0, 3).join(", ") || "balanced profile";
}

function buildTeamContext(teamName, standingsTable) {
  const t = TEAMS[teamName];
  const c = COACHES[teamName];
  const rec = standingsTable && standingsTable[teamName]
    ? `${standingsTable[teamName].w}-${standingsTable[teamName].l}${standingsTable[teamName].otl ? `-${standingsTable[teamName].otl} OTL` : ""}`
    : "exhibition";
  return `${teamName} (${t.conf === "Lake" ? "Lakeshore" : "Mountainside"} Conference, ${t.div} Division; record: ${rec}; identity: ${t.tag}, ${teamIdentityNotes(t)}; Head Coach/GM: ${c.hc}, archetype "${c.hcArch}")`;
}

function summarizeGoals(goals) {
  if (!goals || !goals.length) return "no goals";
  const byScorer = {};
  for (const g of goals) {
    if (!byScorer[g.scorer]) byScorer[g.scorer] = { goals: 0, twoPt: 0, pos: g.pos };
    byScorer[g.scorer].goals++;
    if (g.twoPoint) byScorer[g.scorer].twoPt++;
  }
  return Object.entries(byScorer)
    .sort((a, b) => b[1].goals - a[1].goals)
    .slice(0, 4)
    .map(([name, s]) => `${name} (${POS_NAME[s.pos] || s.pos}) ${s.goals}G${s.twoPt ? ` incl. ${s.twoPt} two-pointer` : ""}`)
    .join("; ");
}

function buildRecapPrompt({ outlet, yearNum, seasonLabel, homeTeam, awayTeam, homeScore, awayScore, ot, homeGoals, awayGoals, homeCtx, awayCtx }) {
  return `You are a sportswriter for ${outlet}, covering the Vermont Professional Lacrosse League (VPLL) — a fictional 32-team professional lacrosse league spread across small-town Vermont, with rabid EPL-style local fanbases.

OUTLET VOICE: ${OUTLET_VOICES[outlet]}

GAME FACTS (${seasonLabel}, Year ${yearNum}):
- Final: ${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}${ot ? " (overtime)" : ""} — ${homeTeam} was home
- ${homeTeam} scoring: ${summarizeGoals(homeGoals)}
- ${awayTeam} scoring: ${summarizeGoals(awayGoals)}

TEAM CONTEXT:
- ${homeCtx}
- ${awayCtx}

RULES:
- This is a fictional league. Never reference real-world years, leagues, teams, or people. The league calendar is simply "Year ${yearNum}".
- You may invent brief post-game quotes, but attribute them ONLY to the coaches or players named above.
- 200-330 words.
- Respond ONLY with valid JSON in exactly this shape, no markdown fences, no preamble: {"headline": "...", "body": "..."}`;
}

function buildHotStovePrompt({ yearNum, corkumChampion, culkinChampion, cupChampion, draft, coaching, retirement, progression }) {
  const topPicks = draft ? draft.results.slice(0, 5).map((p) => `Pick ${p.overallPick}: ${p.team} selects ${p.prospect.name} (${POS_NAME[p.prospect.pos]}, age ${p.prospect.age}, ceiling ${p.prospect.ceiling})`).join("; ") : "draft pending";
  const firings = coaching && coaching.fired.length
    ? coaching.fired.map((f, i) => `${f.team} fired ${f.oldCoach} (${f.oldArch}), hired ${coaching.hired[i]?.newCoach} (${coaching.hired[i]?.newArch})`).join("; ")
    : "no coaching changes";
  const retirements = retirement && retirement.retirees.length
    ? retirement.retirees.slice(0, 6).map((r) => `${r.name} (${POS_NAME[r.pos]}, ${r.team}, age ${r.age})`).join("; ") + (retirement.retirees.length > 6 ? ` and ${retirement.retirees.length - 6} others` : "")
    : "no retirements";
  const movers = progression
    ? [...progression.results].sort((a, b) => b.delta - a.delta).slice(0, 3).map((r) => `${r.team} (${r.oldScore}→${r.newScore})`).join(", ") + "; fallers: " +
      [...progression.results].sort((a, b) => a.delta - b.delta).slice(0, 3).map((r) => `${r.team} (${r.oldScore}→${r.newScore})`).join(", ")
    : "progression pending";

  return `You are the writer of Hot Stove, the offseason rumor and transaction column covering the Vermont Professional Lacrosse League (VPLL) — a fictional 32-team professional lacrosse league in small-town Vermont with rabid EPL-style fanbases and a soft salary cap that resort-town teams love to violate.

OUTLET VOICE: ${OUTLET_VOICES["Hot Stove"]}

YEAR ${yearNum} OFFSEASON FACTS:
- Corkum Trophy (outdoor) champion: ${corkumChampion}
- Culkin Trophy (indoor) champion: ${culkinChampion}
- Commissioners Cup (combined) champion: ${cupChampion}
- Draft: ${topPicks}
- Coaching carousel: ${firings}
- Retirements: ${retirements}
- Risers/fallers heading into next year: ${movers}

RULES:
- This is a fictional league. Never reference real-world years, leagues, teams, or people. The league calendar is simply "Year ${yearNum}".
- You may invent brief quotes from "league sources" or the named coaches.
- 250-400 words. Cover the draft's biggest storyline, the most interesting coaching change, and one bold prediction.
- Respond ONLY with valid JSON in exactly this shape, no markdown fences, no preamble: {"headline": "...", "body": "..."}`;
}

async function fetchArticle(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const text = (data.content || []).filter((i) => i.type === "text").map((i) => i.text).join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  if (!parsed.headline || !parsed.body) throw new Error("Malformed article");
  return parsed;
}

function buildWeekInReviewPrompt({ yearNum, seasonLabel, week, weekGames, standingsTable, isFinalWeek }) {
  const gameLines = weekGames.map((g) =>
    `${g.home} ${g.homeScore}–${g.awayScore} ${g.away}${g.ot ? " (OT)" : ""}`
  ).join("; ");

  const ranked = Object.values(standingsTable).sort((a, b) => b.points - a.points || b.gd - a.gd);
  const top5 = ranked.slice(0, 5).map((t) => `${t.team} (${t.w}-${t.l}${t.otl ? `-${t.otl}` : ""})`).join(", ");
  const bottom5 = ranked.slice(-5).map((t) => `${t.team} (${t.w}-${t.l}${t.otl ? `-${t.otl}` : ""})`).join(", ");

  return `You are the writer of "The Week Ahead," VPLL.com's recurring weekly wrap-up column covering the Vermont Professional Lacrosse League (VPLL) — a fictional 32-team professional lacrosse league in small-town Vermont with rabid EPL-style local fanbases.

OUTLET VOICE: ${OUTLET_VOICES["VPLL.com"]} This is the weekly roundup format specifically — hit multiple games and storylines briskly rather than deep-diving one game. Think "around the league" column.

WEEK ${week} FACTS (${seasonLabel}, Year ${yearNum}):
- Results this week: ${gameLines}
- Current top 5 in the standings: ${top5}
- Current bottom 5 in the standings: ${bottom5}
${isFinalWeek ? "- This is the final week of the regular season — playoff positioning is now locked in." : ""}

RULES:
- This is a fictional league. Never reference real-world years, leagues, teams, or people. The league calendar is simply "Year ${yearNum}".
- Cover 3-4 of the most interesting results or storylines from the week — upsets, statement wins, teams trending up or down, playoff race implications. You do not need to mention every game.
- You may invent brief reactions attributed generically ("fans in [town]") but only name coaches/players who appear in the facts above.
- 220-350 words.
- Respond ONLY with valid JSON in exactly this shape, no markdown fences, no preamble: {"headline": "...", "body": "..."}`;
}

/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap');

.vpll-root {
  --paper: #E4DFCE;
  --paper-dim: #DAD4C0;
  --ink: #16241C;
  --ink-soft: #3A4A3E;
  --forest: #1F4430;
  --forest-soft: #2C5A3F;
  --lake: #23576B;
  --lake-soft: #316E85;
  --maple: #C6871F;
  --maple-soft: #E0A542;
  --barn: #8E3B2E;
  --line: rgba(22,36,28,0.16);
  --white: #FAF8F1;
  font-family: 'Lora', Georgia, serif;
  color: var(--ink);
  background: var(--paper);
  min-height: 100%;
  position: relative;
}
.vpll-root * { box-sizing: border-box; }

.vpll-mesh-bg {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.05;
  background-image:
    repeating-linear-gradient(45deg, var(--ink) 0, var(--ink) 1px, transparent 1px, transparent 16px),
    repeating-linear-gradient(-45deg, var(--ink) 0, var(--ink) 1px, transparent 1px, transparent 16px);
}

.vpll-shell { position: relative; max-width: 1100px; margin: 0 auto; padding: 20px 20px 60px; }

/* ---------- Masthead ---------- */
.vpll-masthead {
  border-bottom: 3px solid var(--ink);
  padding-bottom: 14px;
  margin-bottom: 18px;
}
.vpll-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-soft); margin-bottom: 4px;
}
.vpll-title-row { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.vpll-title {
  font-family: 'Zilla Slab', Georgia, serif; font-weight: 700;
  font-size: clamp(28px, 5vw, 44px); letter-spacing: -0.01em; margin: 0; color: var(--ink);
}
.vpll-title .accent { color: var(--forest); }
.vpll-scoreboard-tag {
  font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.1em;
  background: var(--ink); color: var(--paper); padding: 5px 10px; border-radius: 2px;
}

/* ---------- Tabs ---------- */
.vpll-tabs { display: flex; gap: 2px; margin-bottom: 22px; border-bottom: 1px solid var(--line); }
.vpll-tab {
  font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 10px 18px; cursor: pointer; background: none; border: none; color: var(--ink-soft);
  border-bottom: 3px solid transparent; transition: color 0.15s ease, border-color 0.15s ease;
}
.vpll-tab:hover { color: var(--ink); }
.vpll-tab.active { color: var(--ink); border-bottom-color: var(--maple); font-weight: 700; }
.vpll-tab:focus-visible { outline: 2px solid var(--lake); outline-offset: 2px; }

/* ---------- Section headers ---------- */
.vpll-section-label {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--forest); margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;
}
.vpll-section-label::after { content: ''; flex: 1; height: 1px; background: var(--line); }
.vpll-h2 { font-family: 'Zilla Slab', Georgia, serif; font-weight: 700; font-size: 22px; margin: 0 0 12px 0; }

/* ---------- Matchup builder ---------- */
.vpll-matchup-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: stretch; margin-bottom: 18px; }
@media (max-width: 720px) { .vpll-matchup-grid { grid-template-columns: 1fr; } .vpll-vs-divider { display: none; } }

.vpll-team-card {
  background: var(--white); border: 1px solid var(--line); border-radius: 3px; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.vpll-team-card.home { border-left: 4px solid var(--forest); }
.vpll-team-card.away { border-left: 4px solid var(--lake); }

.vpll-role-tag {
  font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-soft);
}
.vpll-select {
  font-family: 'Lora', serif; font-size: 16px; font-weight: 600; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 2px; background: var(--paper); color: var(--ink);
  width: 100%; cursor: pointer;
}
.vpll-select:focus-visible { outline: 2px solid var(--lake); outline-offset: 1px; }

.vpll-team-meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-soft); display: flex; gap: 10px; flex-wrap: wrap; }
.vpll-tag-pill {
  display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px;
  background: rgba(31,68,48,0.12); color: var(--forest); font-weight: 600;
}

.vpll-bar-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.vpll-bar-label { width: 66px; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; color: var(--ink-soft); font-size: 10px; text-transform: uppercase; }
.vpll-bar-track { flex: 1; height: 7px; background: var(--paper-dim); border-radius: 4px; overflow: hidden; }
.vpll-bar-fill { height: 100%; border-radius: 4px; }
.vpll-bar-fill.home { background: var(--forest); }
.vpll-bar-fill.away { background: var(--lake); }
.vpll-bar-val { font-family: 'JetBrains Mono', monospace; font-size: 11px; width: 22px; text-align: right; color: var(--ink-soft); }

.vpll-vs-divider {
  display: flex; align-items: center; justify-content: center;
  font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 20px; color: var(--maple);
  width: 44px;
}

.vpll-controls-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.vpll-toggle-group { display: inline-flex; border: 1px solid var(--line); border-radius: 3px; overflow: hidden; }
.vpll-toggle-btn {
  font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 7px 14px; background: var(--white);
  border: none; cursor: pointer; color: var(--ink-soft); letter-spacing: 0.05em;
}
.vpll-toggle-btn.active { background: var(--ink); color: var(--paper); }
.vpll-toggle-btn:focus-visible { outline: 2px solid var(--lake); outline-offset: -2px; }

.vpll-btn {
  font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 10px 20px; border-radius: 3px; border: none; cursor: pointer; font-weight: 700;
  background: var(--maple); color: var(--ink); transition: transform 0.1s ease, background 0.15s ease;
}
.vpll-btn:hover { background: var(--maple-soft); }
.vpll-btn:active { transform: scale(0.98); }
.vpll-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.vpll-btn.secondary { background: var(--white); color: var(--ink); border: 1px solid var(--line); }
.vpll-btn.secondary:hover { background: var(--paper-dim); }
.vpll-btn:focus-visible { outline: 2px solid var(--lake); outline-offset: 2px; }

/* ---------- Score reveal ---------- */
@keyframes vpll-flip-in {
  0% { transform: rotateX(90deg); opacity: 0; }
  60% { transform: rotateX(-8deg); opacity: 1; }
  100% { transform: rotateX(0deg); opacity: 1; }
}
.vpll-score-reveal { animation: vpll-flip-in 0.5s ease-out; }
@media (prefers-reduced-motion: reduce) { .vpll-score-reveal { animation: none; } }

/* ---------- Box score ---------- */
.vpll-boxscore {
  background: var(--white); border: 1px solid var(--line); border-radius: 3px; overflow: hidden; margin-bottom: 20px;
}
.vpll-boxscore-header {
  background: var(--ink); color: var(--paper); padding: 18px 20px; display: flex; align-items: center; justify-content: center; gap: 24px;
}
.vpll-bs-team { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.vpll-bs-team-name { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 15px; text-align: center; }
.vpll-bs-score { font-family: 'JetBrains Mono', monospace; font-size: 42px; font-weight: 700; line-height: 1; }
.vpll-bs-score.winner { color: var(--maple-soft); }
.vpll-bs-ot-badge {
  font-family: 'JetBrains Mono', monospace; font-size: 10px; background: var(--barn); color: var(--white);
  padding: 3px 8px; border-radius: 10px; letter-spacing: 0.08em;
}

.vpll-bs-body { padding: 18px 20px; }
.vpll-scoring-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 640px) { .vpll-scoring-summary { grid-template-columns: 1fr; } }
.vpll-goal-list { list-style: none; margin: 0; padding: 0; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; }
.vpll-goal-item { padding: 6px 0; border-bottom: 1px dashed var(--line); display: flex; justify-content: space-between; gap: 8px; }
.vpll-goal-item:last-child { border-bottom: none; }
.vpll-goal-scorer { color: var(--ink); }
.vpll-goal-assist { color: var(--ink-soft); font-size: 11px; }
.vpll-2pt-badge { color: var(--maple); font-weight: 700; }

.vpll-note-row { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--barn); margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.vpll-note-row.fatigue { color: var(--lake-soft); }

/* ---------- History log ---------- */
.vpll-history-list { display: flex; flex-direction: column; gap: 6px; }
.vpll-history-item {
  display: flex; justify-content: space-between; align-items: center; padding: 10px 14px;
  background: var(--white); border: 1px solid var(--line); border-radius: 3px;
  font-family: 'JetBrains Mono', monospace; font-size: 12.5px;
}
.vpll-history-score { font-weight: 700; }

/* ---------- Standings ---------- */
.vpll-standings-table { width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; }
.vpll-standings-table th {
  text-align: left; padding: 8px 10px; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-soft); border-bottom: 2px solid var(--ink); font-weight: 700;
}
.vpll-standings-table td { padding: 7px 10px; border-bottom: 1px solid var(--line); }
.vpll-standings-table tr:nth-child(even) { background: rgba(22,36,28,0.03); }
.vpll-standings-table .num { text-align: right; }
.vpll-standings-table .cup-col { color: var(--maple); font-weight: 700; }
.vpll-div-header { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 15px; margin: 22px 0 8px 0; color: var(--forest); }
.vpll-div-header:first-child { margin-top: 0; }

/* ---------- Empty / info states ---------- */
.vpll-empty {
  padding: 40px 20px; text-align: center; color: var(--ink-soft); font-family: 'Lora', serif; font-style: italic;
  border: 1px dashed var(--line); border-radius: 4px; background: var(--white);
}
.vpll-info-banner {
  background: rgba(198,135,31,0.12); border: 1px solid rgba(198,135,31,0.3); border-radius: 3px;
  padding: 10px 14px; font-size: 12.5px; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace;
  color: var(--ink-soft);
}

.vpll-season-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.vpll-progress-track { flex: 1; min-width: 160px; height: 8px; background: var(--paper-dim); border-radius: 4px; overflow: hidden; }
.vpll-progress-fill { height: 100%; background: var(--forest); border-radius: 4px; transition: width 0.3s ease; }
.vpll-progress-label { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--ink-soft); white-space: nowrap; }

.vpll-week-block { margin-bottom: 14px; }
.vpll-week-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--forest); font-weight: 700; margin-bottom: 6px; letter-spacing: 0.06em; }
.vpll-game-row {
  display: flex; justify-content: space-between; align-items: center; padding: 7px 12px;
  background: var(--white); border: 1px solid var(--line); border-radius: 2px; margin-bottom: 4px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
}
.vpll-game-row .matchup { color: var(--ink); }
.vpll-game-row .played { color: var(--ink-soft); font-weight: 700; }

.vpll-champion-banner {
  background: linear-gradient(135deg, var(--ink) 0%, var(--forest) 100%);
  border-radius: 4px; padding: 22px 24px; margin-bottom: 22px;
  display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
}
.vpll-champion-label {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--maple-soft);
}
.vpll-champion-name {
  font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 28px; color: var(--white);
}

/* ---------- Press Box articles ---------- */
.vpll-article {
  background: var(--white); border: 1px solid var(--line); border-top: 4px solid var(--maple);
  border-radius: 3px; padding: 24px 26px; margin-bottom: 18px;
}
.vpll-article-outlet {
  font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--barn); margin-bottom: 8px;
}
.vpll-article-headline {
  font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 24px; line-height: 1.2;
  color: var(--ink); margin: 0 0 6px 0;
}
.vpll-article-meta {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-soft);
  padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;
}
.vpll-article-body {
  font-family: 'Lora', serif; font-size: 15px; line-height: 1.65; color: var(--ink);
  white-space: pre-wrap;
}
.vpll-article-body::first-letter {
  font-family: 'Zilla Slab', serif; font-size: 2.6em; font-weight: 700; float: left;
  line-height: 0.85; padding-right: 8px; color: var(--forest);
}
.vpll-press-error {
  background: rgba(142,59,46,0.1); border: 1px solid rgba(142,59,46,0.35); border-radius: 3px;
  padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--barn); margin-bottom: 14px;
}
`;

/* ============================================================
   SUBCOMPONENTS
   ============================================================ */

function RatingBar({ label, homeVal, awayVal, max = 10 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span className="vpll-bar-label">{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="vpll-bar-val">{homeVal}</span>
        <div className="vpll-bar-track"><div className="vpll-bar-fill home" style={{ width: `${(homeVal / max) * 100}%` }} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div className="vpll-bar-track"><div className="vpll-bar-fill away" style={{ width: `${(awayVal / max) * 100}%`, marginLeft: "auto" }} /></div>
        <span className="vpll-bar-val">{awayVal}</span>
      </div>
    </div>
  );
}

function TeamCard({ role, teamName, onChange, opponentName }) {
  const t = TEAMS[teamName];
  return (
    <div className={`vpll-team-card ${role}`}>
      <span className="vpll-role-tag">{role === "home" ? "Home" : "Away"}</span>
      <select className="vpll-select" value={teamName} onChange={(e) => onChange(e.target.value)}>
        {TEAM_NAMES.filter((n) => n !== opponentName).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <div className="vpll-team-meta">
        <span>{t.conf === "Lake" ? "Lakeshore" : "Mountainside"} · {t.div}</span>
      </div>
      <span className="vpll-tag-pill">{t.tag}</span>
    </div>
  );
}

function BoxScore({ result }) {
  if (!result) return null;
  const { homeTeam, awayTeam, homeScore, awayScore, ot, homeGoals, awayGoals, homeInjury, awayInjury, homeFatigued, awayFatigued } = result;
  const homeWon = homeScore > awayScore;
  return (
    <div className="vpll-boxscore vpll-score-reveal">
      <div className="vpll-boxscore-header">
        <div className="vpll-bs-team">
          <span className="vpll-bs-team-name">{homeTeam}</span>
          <span className={`vpll-bs-score ${homeWon ? "winner" : ""}`}>{homeScore}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, opacity: 0.7 }}>FINAL</span>
          {ot && <span className="vpll-bs-ot-badge">OT{ot.periods > 1 ? ` (${ot.periods})` : ""}</span>}
        </div>
        <div className="vpll-bs-team">
          <span className="vpll-bs-team-name">{awayTeam}</span>
          <span className={`vpll-bs-score ${!homeWon ? "winner" : ""}`}>{awayScore}</span>
        </div>
      </div>
      <div className="vpll-bs-body">
        <div className="vpll-scoring-summary">
          <div>
            <div className="vpll-section-label">{homeTeam} Scoring</div>
            <ul className="vpll-goal-list">
              {homeGoals.map((g, i) => (
                <li key={i} className="vpll-goal-item">
                  <span className="vpll-goal-scorer">{g.scorer} {g.twoPoint && <span className="vpll-2pt-badge">2PT</span>}</span>
                  {g.assist && <span className="vpll-goal-assist">ast. {g.assist}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="vpll-section-label">{awayTeam} Scoring</div>
            <ul className="vpll-goal-list">
              {awayGoals.map((g, i) => (
                <li key={i} className="vpll-goal-item">
                  <span className="vpll-goal-scorer">{g.scorer} {g.twoPoint && <span className="vpll-2pt-badge">2PT</span>}</span>
                  {g.assist && <span className="vpll-goal-assist">ast. {g.assist}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {(homeInjury || awayInjury) && (
          <div className="vpll-note-row">
            {homeInjury && <div>⚠ {homeTeam}: a player left the game with what's being called a {homeInjury.toLowerCase()} injury.</div>}
            {awayInjury && <div>⚠ {awayTeam}: a player left the game with what's being called a {awayInjury.toLowerCase()} injury.</div>}
          </div>
        )}
        {(homeFatigued || awayFatigued) && (
          <div className="vpll-note-row fatigue">
            {homeFatigued && <div>◐ {homeTeam} played on short rest — second game of the week.</div>}
            {awayFatigued && <div>◐ {awayTeam} played on short rest — second game of the week.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayoffRound({ title, games, roundKey, seasonType, expandedGameKey, onGameClick, boxScoreFor }) {
  if (!games || !games.length) return null;
  return (
    <div className="vpll-week-block">
      <div className="vpll-week-label">{title}</div>
      {games.map((g) => {
        const gameKey = `p-${seasonType}-${roundKey}-${g.id}`;
        const isExpanded = expandedGameKey === gameKey;
        return (
          <div key={g.id}>
            <div
              className="vpll-game-row"
              onClick={() => g.result && onGameClick && onGameClick(seasonType, roundKey, g)}
              style={g.result ? { cursor: "pointer" } : {}}
              title={g.result ? "Click for box score" : ""}
            >
              <span className="matchup">
                {g.home} vs {g.away}
                {g.region && <span style={{ opacity: 0.55 }}> · {g.region.split("|")[1]}</span>}
                {g.conference && <span style={{ opacity: 0.55 }}> · {g.conference === "Lake" ? "Lakeshore" : "Mountainside"}</span>}
              </span>
              <span className="played">
                {g.result ? `${g.result.homeScore}–${g.result.awayScore}${g.result.ot ? " OT" : ""} → ${g.winner} ${isExpanded ? "▾" : "▸"}` : "—"}
              </span>
            </div>
            {isExpanded && g.result && g.result.homeGoals && boxScoreFor && (
              <div style={{ margin: "6px 0 12px" }}>
                <BoxScore result={boxScoreFor(g)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StandingsTable({ table, teamList }) {
  const rows = standingsForGroup(table, teamList);
  const hasPlayoffBonus = rows.some((r) => r.playoffBonus > 0);
  return (
    <table className="vpll-standings-table">
      <thead>
        <tr>
          <th>Team</th><th className="num">W</th><th className="num">L</th><th className="num">OTL</th>
          <th className="num">CUP&nbsp;PTS</th>
          {hasPlayoffBonus && <th className="num">PO&nbsp;BONUS</th>}
          <th className="num">GF</th><th className="num">GA</th><th className="num">DIFF</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.team}>
            <td>{r.team}</td>
            <td className="num">{r.w}</td>
            <td className="num">{r.l}</td>
            <td className="num">{r.otl}</td>
            <td className="num cup-col">{r.points}</td>
            {hasPlayoffBonus && <td className="num cup-col">{r.playoffBonus > 0 ? `+${r.playoffBonus}` : "—"}</td>}
            <td className="num">{r.gf}</td>
            <td className="num">{r.ga}</td>
            <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Article({ article }) {
  if (!article) return null;
  return (
    <div className="vpll-article">
      <div className="vpll-article-outlet">{article.outlet}</div>
      <h3 className="vpll-article-headline">{article.headline}</h3>
      <div className="vpll-article-meta">{article.gameLabel || ""}</div>
      <div className="vpll-article-body">{article.body}</div>
    </div>
  );
}

function CombinedCupTable({ table, teamList }) {
  const rows = teamList
    .map((name) => table[name])
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  return (
    <table className="vpll-standings-table">
      <thead>
        <tr>
          <th>Team</th><th className="num">W</th><th className="num">L</th>
          <th className="num">Corkum&nbsp;Pts</th><th className="num">Culkin&nbsp;Pts</th>
          <th className="num">Total&nbsp;Cup&nbsp;Pts</th><th className="num">DIFF</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.team}>
            <td>{r.team}</td>
            <td className="num">{r.w}</td>
            <td className="num">{r.l}</td>
            <td className="num">{r.corkumTotal}</td>
            <td className="num">{r.culkinTotal > 0 ? r.culkinTotal : "—"}</td>
            <td className="num cup-col">{r.points}</td>
            <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
export default function VPLLSimulator() {
  const [activeTab, setActiveTab] = useState("exhibition");
  const [homeTeam, setHomeTeam] = useState("Charlotte Navigators");
  const [awayTeam, setAwayTeam] = useState("Jay StormKings");
  const [isIndoor, setIsIndoor] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [seasons, setSeasons] = useState({ corkum: null, culkin: null }); // each: { schedule, results, playoffs }
  const [activeSeasonType, setActiveSeasonType] = useState("corkum"); // controls Season/Playoffs tab focus
  const [seasonBusy, setSeasonBusy] = useState(false);
  const [playoffBusy, setPlayoffBusy] = useState(false);
  const [expandedGameKey, setExpandedGameKey] = useState(null); // composite key: s-{seasonType}-{gameId} or p-{seasonType}-{round}-{gameId}
  const [loaded, setLoaded] = useState(false);
  const [standingsView, setStandingsView] = useState("combined"); // 'combined' | 'cup' | 'culkin' | 'division'
  const [divisionSeason, setDivisionSeason] = useState("corkum"); // which season the By Division view shows

  /* ---------- Load persisted state ---------- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const hist = await window.storage.get("vpll-game-history");
        if (!cancelled && hist) setGameHistory(JSON.parse(hist.value));
      } catch (e) { /* no history yet */ }

      // Restore any offseason mutations to team ratings/coaches/rosters from prior sessions
      try {
        const leagueData = await window.storage.get("vpll-league-data-state");
        if (!cancelled && leagueData) {
          const saved = JSON.parse(leagueData.value);
          if (saved.teams) Object.assign(TEAMS, saved.teams);
          if (saved.coaches) Object.assign(COACHES, saved.coaches);
          if (saved.players) Object.assign(PLAYERS_RAW, saved.players);
        }
      } catch (e) { /* no league data mutations yet — using embedded Year 1 defaults */ }

      bootstrapContractsIfNeeded(); // no-op for anyone whose save already has contracts assigned
      migrateLSMIfNeeded(); // no-op for anyone whose save already has the position

      try {
        const meta = await window.storage.get("vpll-meta-state");
        if (!cancelled && meta) {
          const parsed = JSON.parse(meta.value);
          if (parsed.yearNumber) setYearNumber(parsed.yearNumber);
          if (parsed.yearHistory) setYearHistory(parsed.yearHistory);
        }
      } catch (e) { /* first time playing — Year 1, no history yet */ }

      let seasonsLoaded = false;
      try {
        const s = await window.storage.get("vpll-year1-state");
        if (!cancelled && s) { setSeasons(JSON.parse(s.value)); seasonsLoaded = true; }
      } catch (e) { /* no year state yet */ }

      if (!seasonsLoaded) {
        // migrate legacy single-season save (pre-Culkin) into the new corkum slot
        try {
          const legacy = await window.storage.get("vpll-season-state");
          if (!cancelled && legacy) {
            const migrated = { corkum: JSON.parse(legacy.value), culkin: null };
            setSeasons(migrated);
            await window.storage.set("vpll-year1-state", JSON.stringify(migrated));
          }
        } catch (e) { /* nothing to migrate */ }
      }
      if (!cancelled) setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* ---------- Exhibition ---------- */
  const runExhibition = useCallback(async () => {
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 380)); // brief beat for the flip-reveal
    const raw = simulateGame(homeTeam, awayTeam, isIndoor);
    const homeGoals = attributeGoals(homeTeam, raw.homeScore, raw.homeTwoPointGoal);
    const awayGoals = attributeGoals(awayTeam, raw.awayScore, raw.awayTwoPointGoal);
    const result = { ...raw, homeGoals, awayGoals, timestamp: Date.now() };
    setLastResult(result);
    setSimulating(false);

    const historyEntry = {
      homeTeam, awayTeam, homeScore: raw.homeScore, awayScore: raw.awayScore,
      ot: !!raw.ot, isIndoor, timestamp: Date.now(),
    };
    const newHistory = [historyEntry, ...gameHistory].slice(0, 50);
    setGameHistory(newHistory);
    try { await window.storage.set("vpll-game-history", JSON.stringify(newHistory)); } catch (e) {}
  }, [homeTeam, awayTeam, isIndoor, gameHistory]);

  /* ---------- Season (generic across Corkum / Culkin) ---------- */
  const persistSeasons = useCallback(async (newSeasons) => {
    setSeasons(newSeasons);
    try { await window.storage.set("vpll-year1-state", JSON.stringify(newSeasons)); } catch (e) {}
  }, []);

  const corkumChampion = seasons.corkum?.playoffs?.champion || null;
  const culkinUnlocked = !!corkumChampion; // Culkin training camp opens after the Corkum Trophy Final concludes

  const startNewSeason = useCallback(async (seasonType) => {
    if (seasonType === "culkin" && !culkinUnlocked) return;
    const schedule = generateFullSchedule();
    const newSeasonObj = { schedule, results: {}, playoffs: null };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
  }, [seasons, persistSeasons, culkinUnlocked]);

  function currentWeekToPlay(seasonType) {
    const season = seasons[seasonType];
    if (!season) return null;
    const weeksWithUnplayed = season.schedule.filter((g) => !season.results[g.id]).map((g) => g.week);
    return weeksWithUnplayed.length ? Math.min(...weeksWithUnplayed) : null;
  }

  const simulateWeek = useCallback(async (seasonType, weekNum) => {
    const season = seasons[seasonType];
    if (!season) return;
    setSeasonBusy(true);
    await new Promise((r) => setTimeout(r, 200));
    const isIndoorSeason = seasonType === "culkin";
    const weekGames = season.schedule.filter((g) => g.week === weekNum);
    const gamesPlayedThisWeek = {};
    const newResults = { ...season.results };
    for (const g of weekGames) {
      const homeFatigued = (gamesPlayedThisWeek[g.home] || 0) >= 1;
      const awayFatigued = (gamesPlayedThisWeek[g.away] || 0) >= 1;
      const res = simulateGame(g.home, g.away, isIndoorSeason, homeFatigued, awayFatigued);
      newResults[g.id] = { homeScore: res.homeScore, awayScore: res.awayScore, ot: !!res.ot };
      gamesPlayedThisWeek[g.home] = (gamesPlayedThisWeek[g.home] || 0) + 1;
      gamesPlayedThisWeek[g.away] = (gamesPlayedThisWeek[g.away] || 0) + 1;
    }
    const newSeasonObj = { ...season, results: newResults };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
    setSeasonBusy(false);
  }, [seasons, persistSeasons]);

  const simulateFullSeason = useCallback(async (seasonType) => {
    const season = seasons[seasonType];
    if (!season) return;
    setSeasonBusy(true);
    const isIndoorSeason = seasonType === "culkin";
    let workingResults = { ...season.results };
    for (let w = 1; w <= 13; w++) {
      const weekGames = season.schedule.filter((g) => g.week === w && !workingResults[g.id]);
      if (!weekGames.length) continue;
      const gamesPlayedThisWeek = {};
      for (const g of weekGames) {
        const homeFatigued = (gamesPlayedThisWeek[g.home] || 0) >= 1;
        const awayFatigued = (gamesPlayedThisWeek[g.away] || 0) >= 1;
        const res = simulateGame(g.home, g.away, isIndoorSeason, homeFatigued, awayFatigued);
        workingResults[g.id] = { homeScore: res.homeScore, awayScore: res.awayScore, ot: !!res.ot };
        gamesPlayedThisWeek[g.home] = (gamesPlayedThisWeek[g.home] || 0) + 1;
        gamesPlayedThisWeek[g.away] = (gamesPlayedThisWeek[g.away] || 0) + 1;
      }
    }
    const newSeasonObj = { ...season, results: workingResults };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
    setSeasonBusy(false);
  }, [seasons, persistSeasons]);

  const resetSeason = useCallback(async (seasonType) => {
    const updates = { ...seasons, [seasonType]: null };
    if (seasonType === "corkum") updates.culkin = null; // resetting Corkum also clears the downstream Culkin season
    await persistSeasons(updates);
  }, [seasons, persistSeasons]);

  const standingsFor = useMemo(() => {
    const out = {};
    for (const key of ["corkum", "culkin"]) {
      out[key] = seasons[key] ? computeStandings(seasons[key].schedule, seasons[key].results) : null;
    }
    return out;
  }, [seasons]);

  function gamesPlayedFor(seasonType) {
    const season = seasons[seasonType];
    return season ? Object.keys(season.results).length : 0;
  }
  function totalGamesFor(seasonType) {
    const season = seasons[seasonType];
    return season ? season.schedule.length : 0;
  }
  function seasonCompleteFor(seasonType) {
    const season = seasons[seasonType];
    return !!season && gamesPlayedFor(seasonType) === totalGamesFor(seasonType);
  }

  /* ---------- Playoffs (generic across Corkum / Culkin) ---------- */
  const generateBracket = useCallback(async (seasonType) => {
    const table = standingsFor[seasonType];
    if (!table) return;
    const playoffs = initPlayoffs(table);
    const newSeasonObj = { ...seasons[seasonType], playoffs };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
  }, [seasons, standingsFor, persistSeasons]);

  const advancePlayoffRound = useCallback(async (seasonType, round) => {
    const season = seasons[seasonType];
    if (!season || !season.playoffs) return;
    setPlayoffBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const playoffs = JSON.parse(JSON.stringify(season.playoffs)); // deep clone for safe mutation
    const table = standingsFor[seasonType];
    if (round === "wildcard") simulateWildcardRound(playoffs);
    else if (round === "regionalSemis") simulateRegionalSemisRound(playoffs, table);
    else if (round === "regionalFinal") simulateRegionalFinalRound(playoffs, table);
    else if (round === "conferenceFinal") simulateConferenceFinalRound(playoffs, table);
    else if (round === "trophyFinal") simulateTrophyFinalSeries(playoffs);
    const newSeasonObj = { ...season, playoffs };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
    setPlayoffBusy(false);
  }, [seasons, standingsFor, persistSeasons]);

  function nextPlayoffRoundFor(seasonType) {
    const season = seasons[seasonType];
    if (!season || !season.playoffs) return null;
    const p = season.playoffs;
    if (p.wildcard.some((g) => !g.winner)) return "wildcard";
    if (p.regionalSemis.some((g) => !g.winner)) return "regionalSemis";
    if (p.regionalFinal.some((g) => !g.winner)) return "regionalFinal";
    if (p.conferenceFinal.some((g) => !g.winner)) return "conferenceFinal";
    if (p.trophyFinal && !p.trophyFinal.winner) return "trophyFinal";
    return null;
  }

  /* ---------- Box scores for any played game (lazy scorer generation) ---------- */
  const toggleSeasonBoxScore = useCallback(async (seasonType, game) => {
    const key = `s-${seasonType}-${game.id}`;
    if (expandedGameKey === key) { setExpandedGameKey(null); return; }
    const season = seasons[seasonType];
    const res = season?.results?.[game.id];
    if (!res) return;
    if (!res.homeGoals) {
      // generate scorer attribution once, then persist so the box score stays consistent
      const homeGoals = attributeGoals(game.home, res.homeScore, false);
      const awayGoals = attributeGoals(game.away, res.awayScore, false);
      const newResults = { ...season.results, [game.id]: { ...res, homeGoals, awayGoals } };
      await persistSeasons({ ...seasons, [seasonType]: { ...season, results: newResults } });
    }
    setExpandedGameKey(key);
  }, [seasons, expandedGameKey, persistSeasons]);

  const togglePlayoffBoxScore = useCallback(async (seasonType, roundKey, game) => {
    const key = `p-${seasonType}-${roundKey}-${game.id}`;
    if (expandedGameKey === key) { setExpandedGameKey(null); return; }
    const season = seasons[seasonType];
    if (!season?.playoffs || !game.result) return;
    if (!game.result.homeGoals) {
      const playoffs = JSON.parse(JSON.stringify(season.playoffs));
      const target = playoffs[roundKey].find((g) => g.id === game.id);
      target.result.homeGoals = attributeGoals(game.result.home, game.result.homeScore, false);
      target.result.awayGoals = attributeGoals(game.result.away, game.result.awayScore, false);
      await persistSeasons({ ...seasons, [seasonType]: { ...season, playoffs } });
    }
    setExpandedGameKey(key);
  }, [seasons, expandedGameKey, persistSeasons]);

  function boxScoreResultFor(seasonType, game) {
    const res = seasons[seasonType]?.results?.[game.id];
    if (!res) return null;
    return {
      homeTeam: game.home, awayTeam: game.away, homeScore: res.homeScore, awayScore: res.awayScore,
      ot: res.ot ? { periods: 1 } : null, homeGoals: res.homeGoals || [], awayGoals: res.awayGoals || [],
      homeInjury: null, awayInjury: null, homeFatigued: false, awayFatigued: false,
    };
  }

  function playoffBoxScoreResultFor(game) {
    const r = game.result;
    if (!r) return null;
    return {
      homeTeam: r.home, awayTeam: r.away, homeScore: r.homeScore, awayScore: r.awayScore,
      ot: r.ot ? { periods: 1 } : null, homeGoals: r.homeGoals || [], awayGoals: r.awayGoals || [],
      homeInjury: null, awayInjury: null, homeFatigued: false, awayFatigued: false,
    };
  }

  const ROUND_LABELS = { wildcard: "Simulate Wild Card Round", regionalSemis: "Simulate Regional Semifinals",
    regionalFinal: "Simulate Regional Finals", conferenceFinal: "Simulate Conference Finals", trophyFinal: "Simulate Trophy Final (Best of 3)" };

  const TROPHY_LABEL = { corkum: "Corkum Trophy", culkin: "Culkin Trophy" };
  const SEASON_LABEL = { corkum: "Corkum (Outdoor)", culkin: "Culkin (Indoor)" };

  // Single-season standings with that season's own playoff bonus folded in (points + 2/playoff win)
  function seasonCupStandings(seasonType) {
    const table = standingsFor[seasonType];
    if (!table) return null;
    const bonus = seasons[seasonType]?.playoffs?.ccBonus || {};
    const combined = {};
    for (const name of TEAM_NAMES) {
      combined[name] = { ...table[name], points: table[name].points + (bonus[name] || 0), playoffBonus: bonus[name] || 0 };
    }
    return combined;
  }
  const cupStandings = useMemo(() => seasonCupStandings(activeSeasonType), [standingsFor, seasons, activeSeasonType]);

  // TRUE combined Commissioners Cup: Corkum total + Culkin total, across the full year
  const combinedCupStandings = useMemo(() => {
    const combined = {};
    for (const name of TEAM_NAMES) {
      const corkumTable = standingsFor.corkum;
      const culkinTable = standingsFor.culkin;
      const corkumBase = corkumTable ? corkumTable[name].points : 0;
      const corkumBonus = seasons.corkum?.playoffs?.ccBonus?.[name] || 0;
      const culkinBase = culkinTable ? culkinTable[name].points : 0;
      const culkinBonus = seasons.culkin?.playoffs?.ccBonus?.[name] || 0;
      const corkumTotal = corkumBase + corkumBonus;
      const culkinTotal = culkinBase + culkinBonus;
      combined[name] = {
        team: name, corkumTotal, culkinTotal, points: corkumTotal + culkinTotal,
        w: (corkumTable ? corkumTable[name].w : 0) + (culkinTable ? culkinTable[name].w : 0),
        l: (corkumTable ? corkumTable[name].l : 0) + (culkinTable ? culkinTable[name].l : 0),
        gf: (corkumTable ? corkumTable[name].gf : 0) + (culkinTable ? culkinTable[name].gf : 0),
        ga: (corkumTable ? corkumTable[name].ga : 0) + (culkinTable ? culkinTable[name].ga : 0),
        gd: ((corkumTable ? corkumTable[name].gd : 0) + (culkinTable ? culkinTable[name].gd : 0)),
        otl: (corkumTable ? corkumTable[name].otl : 0) + (culkinTable ? culkinTable[name].otl : 0),
      };
    }
    return combined;
  }, [standingsFor, seasons]);

  /* ---------- Offseason ---------- */
  const [yearNumber, setYearNumber] = useState(1);
  const [offseason, setOffseason] = useState({ draft: null, coaching: null, retirement: null, progression: null, freeAgency: null, trades: null });
  const [yearHistory, setYearHistory] = useState([]); // archived summaries of completed years
  const [dataVersion, setDataVersion] = useState(0); // bump to force re-render after mutating TEAMS/COACHES/PLAYERS_RAW
  const [offseasonBusy, setOffseasonBusy] = useState(false);

  const bothTrophiesDecided = !!(seasons.corkum?.playoffs?.champion && seasons.culkin?.playoffs?.champion);

  function playoffTeamSet(seasonType) {
    const p = seasons[seasonType]?.playoffs;
    const set = new Set();
    if (!p) return set;
    for (const g of p.wildcard) { set.add(g.home); set.add(g.away); }
    for (const rk of Object.keys(p.seeds)) { set.add(p.seeds[rk].div1.winner); set.add(p.seeds[rk].div2.winner); }
    return set;
  }

  async function persistOffseasonExtras(newYearNumber, newYearHistory) {
    try {
      await window.storage.set("vpll-meta-state", JSON.stringify({ yearNumber: newYearNumber, yearHistory: newYearHistory }));
    } catch (e) {}
  }

  async function persistLeagueData() {
    try {
      await window.storage.set("vpll-league-data-state", JSON.stringify({ teams: TEAMS, coaches: COACHES, players: PLAYERS_RAW }));
    } catch (e) {}
  }

  const runDraftStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const standingsArr = Object.values(combinedCupStandings);
    const draftOrder = buildDraftOrder(standingsArr);
    const usedNames = new Set();
    for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); COACHES[t] && usedNames.add(COACHES[t].hc); }

    // Picks are inserted into the roster immediately, so a team's later picks in the
    // same draft reflect the needs its earlier picks just addressed.
    const results = [];
    let overallPick = 1;
    for (let round = 1; round <= 5; round++) {
      for (const team of draftOrder) {
        const pr = generateProspect(round, usedNames, team);
        results.push({ overallPick, round, team, prospect: pr });
        const leadership = Math.round(rand(30, 60));
        const balance = Math.round(rand(3, 8));
        const durability = Math.round(rand(45, 80));
        const tuple = [pr.name, pr.pos, pr.hand, pr.age, pr.overall, 0, leadership, balance, durability];
        assignNewContract(tuple, CONTRACT_TYPES.ROOKIE);
        const roundScale = [1, 0.75, 0.55, 0.4, 0.3][round - 1];
        tuple[9] = Math.round((tuple[9] * roundScale) / 500) * 500;
        tuple[12] = pr.ceiling; // development target — this is what lets a pick actually pan out (or not)
        PLAYERS_RAW[team].push(tuple);
        overallPick++;
      }
    }
    // keep rosters from ballooning indefinitely — release the weakest depth once over 32
    for (const team of TEAM_NAMES) {
      const roster = PLAYERS_RAW[team];
      while (roster.length > 32) {
        let worstIdx = 0;
        for (let i = 1; i < roster.length; i++) if (roster[i][4] < roster[worstIdx][4]) worstIdx = i;
        roster.splice(worstIdx, 1);
      }
    }

    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, draft: { draftOrder, results } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings]);

  const runFreeAgencyStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const reSigned = [], departed = [], signed = [];
    const openMarket = [];
    const standingsMap = combinedCupStandings;

    function pickMotivation() {
      const r = Math.random();
      if (r < 0.55) return "Loyalist";
      if (r < 0.80) return "Mercenary";
      return "Winner";
    }
    function reSignChance(motivation, team) {
      if (motivation === "Loyalist") return 0.85;
      if (motivation === "Mercenary") return 0.30;
      return (standingsMap[team]?.points || 0) > 20 ? 0.55 : 0.28; // Winner: stays if the team is actually winning
    }
    function rankTeamsForPlayer(player, motivation) {
      const pos = player[1];
      const candidates = TEAM_NAMES.map((t) => {
        const room = SALARY_CAP - teamPayroll(t);
        const posAvg = avgOverallByPosition(t)[pos];
        const needScore = posAvg == null ? 60 : Math.max(0, 100 - posAvg);
        return { t, room, needScore, points: standingsMap[t]?.points || 0 };
      }).filter((x) => x.room > 8000);
      if (motivation === "Mercenary") candidates.sort((a, b) => (b.room + b.needScore * 15000) - (a.room + a.needScore * 15000));
      else if (motivation === "Winner") candidates.sort((a, b) => b.points - a.points || b.room - a.room);
      else candidates.sort((a, b) => (b.needScore * 2000 + b.room) - (a.needScore * 2000 + a.room));
      return candidates;
    }

    for (const team of TEAM_NAMES) {
      const roster = PLAYERS_RAW[team];
      for (let i = roster.length - 1; i >= 0; i--) {
        const p = roster[i];
        const yearsLeft = (p[10] || 1) - 1;
        if (yearsLeft > 0) { p[10] = yearsLeft; continue; }
        const motivation = pickMotivation();
        if (Math.random() < reSignChance(motivation, team)) {
          assignNewContract(p);
          reSigned.push({ team, name: p[0], ovr: p[4], aav: p[9], motivation });
        } else {
          roster.splice(i, 1);
          openMarket.push({ fromTeam: team, player: p, motivation });
        }
      }
    }

    openMarket.sort((a, b) => b.player[4] - a.player[4]);
    for (const entry of openMarket) {
      const teamsRanked = rankTeamsForPlayer(entry.player, entry.motivation).filter((x) => PLAYERS_RAW[x.t].length < 30);
      if (teamsRanked.length && Math.random() < 0.6) {
        const dest = teamsRanked[0].t;
        assignNewContract(entry.player);
        PLAYERS_RAW[dest].push(entry.player);
        signed.push({ team: dest, name: entry.player[0], ovr: entry.player[4], from: entry.fromTeam, aav: entry.player[9], motivation: entry.motivation });
      } else {
        departed.push({ team: entry.fromTeam, name: entry.player[0], ovr: entry.player[4] });
      }
    }

    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, freeAgency: { reSigned, signed, departed } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings]);

  const runTradesStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const trades = runTradeEngine(combinedCupStandings);
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, trades: { trades } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings]);

  /* ---------- Manual trade override ---------- */
  const [manualTeamA, setManualTeamA] = useState(TEAM_NAMES[0]);
  const [manualTeamB, setManualTeamB] = useState(TEAM_NAMES[1]);
  const [manualPlayerA, setManualPlayerA] = useState("");
  const [manualPlayerB, setManualPlayerB] = useState("");
  const [manualTradeMsg, setManualTradeMsg] = useState(null);

  const executeManualTrade = useCallback(async () => {
    const rosterA = PLAYERS_RAW[manualTeamA], rosterB = PLAYERS_RAW[manualTeamB];
    const playerA = rosterA.find((p) => p[0] === manualPlayerA);
    const playerB = rosterB.find((p) => p[0] === manualPlayerB);
    if (!playerA || !playerB) { setManualTradeMsg("Pick a player from each roster first."); return; }
    const ok = executeTrade(manualTeamA, manualTeamB, playerA, playerB);
    if (ok) {
      setManualTradeMsg(`Done — ${playerA[0]} to ${manualTeamB}, ${playerB[0]} to ${manualTeamA}.`);
      setManualPlayerA(""); setManualPlayerB("");
      setDataVersion((v) => v + 1);
      await persistLeagueData();
    } else {
      setManualTradeMsg("That trade couldn't be completed.");
    }
  }, [manualTeamA, manualTeamB, manualPlayerA, manualPlayerB]);

  const runCoachingStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const standingsArr = Object.values(combinedCupStandings).sort((a, b) => b.points - a.points);
    const corkumPlayoffTeams = playoffTeamSet("corkum");
    const culkinPlayoffTeams = playoffTeamSet("culkin");
    const usedNames = new Set();
    for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); usedNames.add(COACHES[t].hc); }

    const fired = [];
    standingsArr.forEach((entry, idx) => {
      const coach = COACHES[entry.team];
      const { fired: wasFired, strugglingYears } = evaluateFiring(coach, corkumPlayoffTeams.has(entry.team), culkinPlayoffTeams.has(entry.team), idx + 1, coach.hcComp);
      coach.hcStruggleYears = strugglingYears;
      if (wasFired) fired.push({ team: entry.team, oldCoach: coach.hc, oldArch: coach.hcArch, tenure: coach.hcTenure || 1 });
      else coach.hcTenure = (coach.hcTenure || 1) + 1;
    });

    const hired = [];
    for (const f of fired) {
      const newCoach = generateFreshCoach(usedNames);
      COACHES[f.team].hc = newCoach.name;
      COACHES[f.team].hcArch = newCoach.archetype;
      COACHES[f.team].hcComp = newCoach.competence;
      COACHES[f.team].hcDev = newCoach.development;
      COACHES[f.team].hcTenure = 1;
      COACHES[f.team].hcStruggleYears = 0;
      hired.push({ team: f.team, newCoach: newCoach.name, newArch: newCoach.archetype });
    }
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, coaching: { fired, hired } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings, seasons]);

  const runRetirementStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const retirees = [];
    for (const teamName of TEAM_NAMES) {
      const roster = PLAYERS_RAW[teamName];
      for (let i = roster.length - 1; i >= 0; i--) {
        if (evaluateRetirement(roster[i])) {
          retirees.push({ team: teamName, name: roster[i][0], age: roster[i][3], pos: roster[i][1] });
          roster.splice(i, 1);
        }
      }
    }
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, retirement: { retirees } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, []);

  const runProgressionStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const { results, developments } = applyLeagueProgression(combinedCupStandings);
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, progression: { results, developments } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings]);

  const allOffseasonStepsComplete = offseason.draft && offseason.coaching && offseason.retirement && offseason.progression && offseason.freeAgency && offseason.trades;

  const beginYear2 = useCallback(async () => {
    const summary = {
      year: yearNumber,
      corkumChampion: seasons.corkum?.playoffs?.champion,
      culkinChampion: seasons.culkin?.playoffs?.champion,
      cupChampion: Object.values(combinedCupStandings).sort((a, b) => b.points - a.points)[0]?.team,
      draftFirstPick: offseason.draft?.results?.[0],
      coachesFired: offseason.coaching?.fired?.length || 0,
      retirements: offseason.retirement?.retirees?.length || 0,
    };
    const newHistory = [...yearHistory, summary];
    const newYearNumber = yearNumber + 1;
    setYearHistory(newHistory);
    setYearNumber(newYearNumber);
    setOffseason({ draft: null, coaching: null, retirement: null, progression: null, freeAgency: null, trades: null });
    await persistSeasons({ corkum: null, culkin: null });
    await persistOffseasonExtras(newYearNumber, newHistory);
  }, [yearNumber, yearHistory, seasons, combinedCupStandings, offseason, persistSeasons]);

  /* ---------- Reset League to Year 1 ---------- */
  const [confirmReset, setConfirmReset] = useState(false);

  const resetLeagueToYear1 = useCallback(async () => {
    // restore every mutable team/coach/player field to the pristine Year 1 snapshot
    const fresh = JSON.parse(JSON.stringify(PRISTINE_YEAR1));
    for (const t of TEAM_NAMES) {
      Object.keys(TEAMS[t]).forEach((k) => delete TEAMS[t][k]);
      Object.assign(TEAMS[t], fresh.teams[t]);
      Object.keys(COACHES[t]).forEach((k) => delete COACHES[t][k]);
      Object.assign(COACHES[t], fresh.coaches[t]);
      PLAYERS_RAW[t].length = 0;
      PLAYERS_RAW[t].push(...fresh.players[t]);
    }
    bootstrapContractsIfNeeded();
    migrateLSMIfNeeded();

    setSeasons({ corkum: null, culkin: null });
    setYearNumber(1);
    setYearHistory([]);
    setOffseason({ draft: null, coaching: null, retirement: null, progression: null, freeAgency: null, trades: null });
    setGameHistory([]);
    setPressArchive([]);
    setLastResult(null);
    setExhibitionArticle(null);
    setDataVersion((v) => v + 1);

    try {
      await window.storage.delete("vpll-league-data-state");
      await window.storage.delete("vpll-meta-state");
      await window.storage.delete("vpll-year1-state");
      await window.storage.delete("vpll-season-state");
      await window.storage.delete("vpll-game-history");
      await window.storage.delete("vpll-pressbox-archive");
    } catch (e) { /* keys may not exist yet, fine either way */ }
    setConfirmReset(false);
  }, []);

  /* ---------- Press Box (Phase 5: narrative layer) ---------- */
  const [pressArchive, setPressArchive] = useState([]);
  const [pressOutlet, setPressOutlet] = useState("VPLL.com");
  const [pressSelection, setPressSelection] = useState("");
  const [pressGenerating, setPressGenerating] = useState(false);
  const [pressError, setPressError] = useState(null);
  const [exhibitionOutlet, setExhibitionOutlet] = useState("VPLL.com");
  const [exhibitionArticle, setExhibitionArticle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const a = await window.storage.get("vpll-pressbox-archive");
        if (!cancelled && a) setPressArchive(JSON.parse(a.value));
      } catch (e) { /* no archive yet */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveToArchive = useCallback(async (article) => {
    const newArchive = [article, ...pressArchive].slice(0, 30);
    setPressArchive(newArchive);
    try { await window.storage.set("vpll-pressbox-archive", JSON.stringify(newArchive)); } catch (e) {}
  }, [pressArchive]);

  // Build the list of recap-able games: all played season + playoff games across both seasons
  const pressGameOptions = useMemo(() => {
    const groups = [];
    for (const seasonType of ["corkum", "culkin"]) {
      const season = seasons[seasonType];
      if (!season) continue;
      const label = seasonType === "corkum" ? "Corkum" : "Culkin";
      const seasonGames = season.schedule
        .filter((g) => season.results[g.id])
        .map((g) => ({
          key: `s|${seasonType}|${g.id}`,
          label: `${label} Wk${g.week}: ${g.home} ${season.results[g.id].homeScore}–${season.results[g.id].awayScore} ${g.away}${season.results[g.id].ot ? " OT" : ""}`,
        }));
      if (seasonGames.length) groups.push({ group: `${label} Season`, options: seasonGames });
      if (season.playoffs) {
        const poGames = [];
        for (const roundKey of ["wildcard", "regionalSemis", "regionalFinal", "conferenceFinal"]) {
          for (const g of season.playoffs[roundKey]) {
            if (g.result) poGames.push({
              key: `p|${seasonType}|${roundKey}|${g.id}`,
              label: `${label} Playoffs: ${g.result.home} ${g.result.homeScore}–${g.result.awayScore} ${g.result.away}${g.result.ot ? " OT" : ""}`,
            });
          }
        }
        if (poGames.length) groups.push({ group: `${label} Playoffs`, options: poGames });
      }
    }
    return groups;
  }, [seasons]);

  const generateGameRecap = useCallback(async () => {
    if (!pressSelection) return;
    setPressGenerating(true);
    setPressError(null);
    try {
      const parts = pressSelection.split("|");
      let gameData;
      let seasonType;
      if (parts[0] === "s") {
        seasonType = parts[1];
        const gameId = Number(parts[2]);
        const season = seasons[seasonType];
        const g = season.schedule.find((x) => x.id === gameId);
        let res = season.results[gameId];
        if (!res.homeGoals) {
          const homeGoals = attributeGoals(g.home, res.homeScore, false);
          const awayGoals = attributeGoals(g.away, res.awayScore, false);
          res = { ...res, homeGoals, awayGoals };
          await persistSeasons({ ...seasons, [seasonType]: { ...season, results: { ...season.results, [gameId]: res } } });
        }
        gameData = { homeTeam: g.home, awayTeam: g.away, homeScore: res.homeScore, awayScore: res.awayScore, ot: res.ot, homeGoals: res.homeGoals, awayGoals: res.awayGoals, seasonLabel: `${seasonType === "corkum" ? "Corkum (outdoor)" : "Culkin (indoor)"} regular season, Week ${g.week}` };
      } else {
        seasonType = parts[1];
        const roundKey = parts[2];
        const gameId = Number(parts[3]);
        const season = seasons[seasonType];
        const g = season.playoffs[roundKey].find((x) => x.id === gameId);
        let r = g.result;
        if (!r.homeGoals) {
          const playoffs = JSON.parse(JSON.stringify(season.playoffs));
          const target = playoffs[roundKey].find((x) => x.id === gameId);
          target.result.homeGoals = attributeGoals(r.home, r.homeScore, false);
          target.result.awayGoals = attributeGoals(r.away, r.awayScore, false);
          await persistSeasons({ ...seasons, [seasonType]: { ...season, playoffs } });
          r = target.result;
        }
        const roundNames = { wildcard: "Wild Card Round", regionalSemis: "Regional Semifinal", regionalFinal: "Regional Final", conferenceFinal: "Conference Final" };
        gameData = { homeTeam: r.home, awayTeam: r.away, homeScore: r.homeScore, awayScore: r.awayScore, ot: r.ot, homeGoals: r.homeGoals, awayGoals: r.awayGoals, seasonLabel: `${seasonType === "corkum" ? "Corkum" : "Culkin"} Playoffs — ${roundNames[roundKey]}` };
      }
      const table = standingsFor[seasonType];
      const prompt = buildRecapPrompt({
        outlet: pressOutlet, yearNum: yearNumber, seasonLabel: gameData.seasonLabel,
        homeTeam: gameData.homeTeam, awayTeam: gameData.awayTeam, homeScore: gameData.homeScore, awayScore: gameData.awayScore,
        ot: gameData.ot, homeGoals: gameData.homeGoals, awayGoals: gameData.awayGoals,
        homeCtx: buildTeamContext(gameData.homeTeam, table), awayCtx: buildTeamContext(gameData.awayTeam, table),
      });
      const article = await fetchArticle(prompt);
      await saveToArchive({ ...article, outlet: pressOutlet, gameLabel: `${gameData.homeTeam} ${gameData.homeScore}–${gameData.awayScore} ${gameData.awayTeam}`, timestamp: Date.now() });
    } catch (e) {
      setPressError("The presses jammed — the article couldn't be generated. Try again.");
    }
    setPressGenerating(false);
  }, [pressSelection, pressOutlet, seasons, standingsFor, yearNumber, persistSeasons, saveToArchive]);

  function latestCompletedWeek(seasonType) {
    const season = seasons[seasonType];
    if (!season) return null;
    const weeksWithGames = [...new Set(season.schedule.map((g) => g.week))].sort((a, b) => b - a);
    for (const w of weeksWithGames) {
      const weekGames = season.schedule.filter((g) => g.week === w);
      if (weekGames.length && weekGames.every((g) => season.results[g.id])) return w;
    }
    return null;
  }

  const [weekReviewSeasonType, setWeekReviewSeasonType] = useState("corkum");

  const generateWeekInReview = useCallback(async () => {
    const seasonType = weekReviewSeasonType;
    const week = latestCompletedWeek(seasonType);
    if (!week) return;
    setPressGenerating(true);
    setPressError(null);
    try {
      const season = seasons[seasonType];
      const weekGames = season.schedule.filter((g) => g.week === week).map((g) => ({ ...g, ...season.results[g.id] }));
      const table = standingsFor[seasonType];
      const totalWeeks = 13;
      const prompt = buildWeekInReviewPrompt({
        yearNum: yearNumber, seasonLabel: seasonType === "corkum" ? "Corkum (outdoor) regular season" : "Culkin (indoor) regular season",
        week, weekGames, standingsTable: table, isFinalWeek: week === totalWeeks,
      });
      const article = await fetchArticle(prompt);
      await saveToArchive({ ...article, outlet: "VPLL.com", gameLabel: `${seasonType === "corkum" ? "Corkum" : "Culkin"} Week ${week} in Review`, timestamp: Date.now() });
    } catch (e) {
      setPressError("The presses jammed — the column couldn't be generated. Try again.");
    }
    setPressGenerating(false);
  }, [weekReviewSeasonType, seasons, standingsFor, yearNumber, saveToArchive]);

  const generateHotStoveColumn = useCallback(async () => {
    setPressGenerating(true);
    setPressError(null);
    try {
      const cupChampion = Object.values(combinedCupStandings).sort((a, b) => b.points - a.points)[0]?.team;
      const prompt = buildHotStovePrompt({
        yearNum: yearNumber,
        corkumChampion: seasons.corkum?.playoffs?.champion || "TBD",
        culkinChampion: seasons.culkin?.playoffs?.champion || "TBD",
        cupChampion: cupChampion || "TBD",
        draft: offseason.draft, coaching: offseason.coaching, retirement: offseason.retirement, progression: offseason.progression,
      });
      const article = await fetchArticle(prompt);
      await saveToArchive({ ...article, outlet: "Hot Stove", gameLabel: `Year ${yearNumber} Offseason`, timestamp: Date.now() });
    } catch (e) {
      setPressError("The presses jammed — the column couldn't be generated. Try again.");
    }
    setPressGenerating(false);
  }, [yearNumber, seasons, offseason, combinedCupStandings, saveToArchive]);

  const generateExhibitionRecap = useCallback(async () => {
    if (!lastResult) return;
    setPressGenerating(true);
    setPressError(null);
    setExhibitionArticle(null);
    try {
      const prompt = buildRecapPrompt({
        outlet: exhibitionOutlet, yearNum: yearNumber, seasonLabel: `exhibition (${lastResult.isIndoor ? "indoor" : "outdoor"})`,
        homeTeam: lastResult.homeTeam, awayTeam: lastResult.awayTeam, homeScore: lastResult.homeScore, awayScore: lastResult.awayScore,
        ot: !!lastResult.ot, homeGoals: lastResult.homeGoals, awayGoals: lastResult.awayGoals,
        homeCtx: buildTeamContext(lastResult.homeTeam, null), awayCtx: buildTeamContext(lastResult.awayTeam, null),
      });
      const article = await fetchArticle(prompt);
      setExhibitionArticle({ ...article, outlet: exhibitionOutlet });
      await saveToArchive({ ...article, outlet: exhibitionOutlet, gameLabel: `Exhibition: ${lastResult.homeTeam} ${lastResult.homeScore}–${lastResult.awayScore} ${lastResult.awayTeam}`, timestamp: Date.now() });
    } catch (e) {
      setPressError("The presses jammed — the recap couldn't be generated. Try again.");
    }
    setPressGenerating(false);
  }, [lastResult, exhibitionOutlet, yearNumber, saveToArchive]);


  const homeT = TEAMS[homeTeam], awayT = TEAMS[awayTeam];

  return (
    <div className="vpll-root">
      <style>{STYLES}</style>
      <div className="vpll-mesh-bg" />
      <div className="vpll-shell">
        <header className="vpll-masthead">
          <div className="vpll-eyebrow">Vermont Professional Lacrosse League</div>
          <div className="vpll-title-row">
            <h1 className="vpll-title">VPLL <span className="accent">Simulation Engine</span></h1>
            <span className="vpll-scoreboard-tag">
              YEAR {yearNumber} · {bothTrophiesDecided ? "OFFSEASON" : seasons.culkin ? "CULKIN SEASON" : corkumChampion ? "OFFSEASON WINDOW" : "CORKUM SEASON"}
            </span>
          </div>
        </header>

        <nav className="vpll-tabs">
          <button className={`vpll-tab ${activeTab === "exhibition" ? "active" : ""}`} onClick={() => setActiveTab("exhibition")}>Exhibition</button>
          <button className={`vpll-tab ${activeTab === "season" ? "active" : ""}`} onClick={() => setActiveTab("season")}>Season</button>
          <button className={`vpll-tab ${activeTab === "playoffs" ? "active" : ""}`} onClick={() => setActiveTab("playoffs")}>Playoffs</button>
          <button className={`vpll-tab ${activeTab === "standings" ? "active" : ""}`} onClick={() => setActiveTab("standings")}>Standings</button>
          <button className={`vpll-tab ${activeTab === "offseason" ? "active" : ""}`} onClick={() => setActiveTab("offseason")}>Offseason</button>
          <button className={`vpll-tab ${activeTab === "pressbox" ? "active" : ""}`} onClick={() => setActiveTab("pressbox")}>Press Box</button>
        </nav>

        {activeTab === "exhibition" && (
          <section>
            <div className="vpll-section-label">Build the Matchup</div>
            <div className="vpll-matchup-grid">
              <TeamCard role="home" teamName={homeTeam} onChange={setHomeTeam} opponentName={awayTeam} />
              <div className="vpll-vs-divider">VS</div>
              <TeamCard role="away" teamName={awayTeam} onChange={setAwayTeam} opponentName={homeTeam} />
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 3, padding: 14, marginBottom: 18 }}>
              <div className="vpll-bar-row" style={{ marginBottom: 6 }}><span className="vpll-bar-label">OFF</span></div>
              <RatingBar label="Offense" homeVal={homeT.offPos} awayVal={awayT.offPos} />
              <RatingBar label="Defense" homeVal={homeT.defPos} awayVal={awayT.defPos} />
              <RatingBar label="Riding" homeVal={homeT.riding} awayVal={awayT.riding} />
              <RatingBar label="Clearing" homeVal={homeT.clearing} awayVal={awayT.clearing} />
              <RatingBar label="Faceoff" homeVal={homeT.fofClm} awayVal={awayT.fofClm} />
              <RatingBar label="Clutch" homeVal={homeT.clutch} awayVal={awayT.clutch} />
            </div>

            <div className="vpll-controls-row">
              <div className="vpll-toggle-group">
                <button className={`vpll-toggle-btn ${!isIndoor ? "active" : ""}`} onClick={() => setIsIndoor(false)}>Outdoor (Corkum)</button>
                <button className={`vpll-toggle-btn ${isIndoor ? "active" : ""}`} onClick={() => setIsIndoor(true)}>Indoor (Culkin)</button>
              </div>
              <button className="vpll-btn" onClick={runExhibition} disabled={simulating}>
                {simulating ? "Simulating…" : "Simulate Game"}
              </button>
            </div>

            {lastResult && <BoxScore result={lastResult} />}

            {lastResult && (
              <div style={{ marginBottom: 18 }}>
                <div className="vpll-controls-row">
                  <div className="vpll-toggle-group">
                    {["VPLL.com", "The Mesh", "The X"].map((o) => (
                      <button key={o} className={`vpll-toggle-btn ${exhibitionOutlet === o ? "active" : ""}`} onClick={() => setExhibitionOutlet(o)}>{o}</button>
                    ))}
                  </div>
                  <button className="vpll-btn secondary" onClick={generateExhibitionRecap} disabled={pressGenerating}>
                    {pressGenerating ? "Writing…" : "Write Recap"}
                  </button>
                </div>
                {pressError && <div className="vpll-press-error">{pressError}</div>}
                {exhibitionArticle && <Article article={exhibitionArticle} />}
              </div>
            )}

            {gameHistory.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div className="vpll-section-label">Recent Games</div>
                <div className="vpll-history-list">
                  {gameHistory.slice(0, 8).map((h, i) => (
                    <div key={i} className="vpll-history-item">
                      <span>{h.homeTeam} vs {h.awayTeam} {h.isIndoor ? "(Indoor)" : "(Outdoor)"}</span>
                      <span className="vpll-history-score">{h.homeScore} – {h.awayScore}{h.ot ? " OT" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "season" && (
          <section>
            <div className="vpll-toggle-group" style={{ marginBottom: 18 }}>
              <button className={`vpll-toggle-btn ${activeSeasonType === "corkum" ? "active" : ""}`} onClick={() => setActiveSeasonType("corkum")}>Corkum (Outdoor)</button>
              <button className={`vpll-toggle-btn ${activeSeasonType === "culkin" ? "active" : ""}`} onClick={() => culkinUnlocked && setActiveSeasonType("culkin")} disabled={!culkinUnlocked} style={!culkinUnlocked ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
                Culkin (Indoor) {!culkinUnlocked && "🔒"}
              </button>
            </div>

            {activeSeasonType === "culkin" && !culkinUnlocked && (
              <div className="vpll-empty">The Culkin (Indoor) season unlocks once the Corkum Trophy Final has been decided. Training camp opens mid-August, right after the outdoor championship.</div>
            )}

            {(activeSeasonType === "corkum" || culkinUnlocked) && !seasons[activeSeasonType] && (
              <div className="vpll-empty">
                <p style={{ margin: "0 0 14px 0" }}>No {SEASON_LABEL[activeSeasonType]} season in progress. Generate a full 13-week, 256-game schedule to begin.</p>
                <button className="vpll-btn" onClick={() => startNewSeason(activeSeasonType)}>Generate {SEASON_LABEL[activeSeasonType]} Schedule</button>
              </div>
            )}

            {seasons[activeSeasonType] && (
              <>
                <div className="vpll-season-progress">
                  <span className="vpll-progress-label">{gamesPlayedFor(activeSeasonType)} / {totalGamesFor(activeSeasonType)} games played</span>
                  <div className="vpll-progress-track"><div className="vpll-progress-fill" style={{ width: `${(gamesPlayedFor(activeSeasonType) / totalGamesFor(activeSeasonType)) * 100}%` }} /></div>
                </div>
                <div className="vpll-controls-row">
                  {!seasonCompleteFor(activeSeasonType) && currentWeekToPlay(activeSeasonType) && (
                    <button className="vpll-btn" onClick={() => simulateWeek(activeSeasonType, currentWeekToPlay(activeSeasonType))} disabled={seasonBusy}>
                      {seasonBusy ? "Simulating…" : `Simulate Week ${currentWeekToPlay(activeSeasonType)}`}
                    </button>
                  )}
                  {!seasonCompleteFor(activeSeasonType) && (
                    <button className="vpll-btn secondary" onClick={() => simulateFullSeason(activeSeasonType)} disabled={seasonBusy}>
                      {seasonBusy ? "Simulating…" : "Simulate Rest of Season"}
                    </button>
                  )}
                  <button className="vpll-btn secondary" onClick={() => resetSeason(activeSeasonType)}>Reset {SEASON_LABEL[activeSeasonType]} Season</button>
                </div>
                {seasonCompleteFor(activeSeasonType) && (
                  <div className="vpll-info-banner">
                    {SEASON_LABEL[activeSeasonType]} regular season complete. Head to the Playoffs tab to generate the bracket.
                    {activeSeasonType === "corkum" && !seasons.culkin && " Once the Corkum Trophy is decided, the Culkin season unlocks here."}
                  </div>
                )}

                <div className="vpll-section-label" style={{ marginTop: 20 }}>Schedule by Week</div>
                {Array.from({ length: 13 }, (_, i) => i + 1).map((w) => {
                  const weekGames = seasons[activeSeasonType].schedule.filter((g) => g.week === w);
                  if (!weekGames.length) return null;
                  const label = w === 7 ? `Week ${w} — Interconference` : w === 12 ? `Week ${w} — Interconference` : w === 13 ? `Week ${w} — Rivalry Week` : `Week ${w}`;
                  return (
                    <div className="vpll-week-block" key={w}>
                      <div className="vpll-week-label">{label}</div>
                      {weekGames.map((g) => {
                        const res = seasons[activeSeasonType].results[g.id];
                        const gameKey = `s-${activeSeasonType}-${g.id}`;
                        const isExpanded = expandedGameKey === gameKey;
                        return (
                          <div key={g.id}>
                            <div
                              className="vpll-game-row"
                              onClick={() => res && toggleSeasonBoxScore(activeSeasonType, g)}
                              style={res ? { cursor: "pointer" } : {}}
                              title={res ? "Click for box score" : ""}
                            >
                              <span className="matchup">{g.home} vs {g.away}</span>
                              <span className="played">{res ? `${res.homeScore}–${res.awayScore}${res.ot ? " OT" : ""} ${isExpanded ? "▾" : "▸"}` : "—"}</span>
                            </div>
                            {isExpanded && res && res.homeGoals && (
                              <div style={{ margin: "6px 0 12px" }}>
                                <BoxScore result={boxScoreResultFor(activeSeasonType, g)} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </section>
        )}

        {activeTab === "playoffs" && (
          <section>
            <div className="vpll-toggle-group" style={{ marginBottom: 18 }}>
              <button className={`vpll-toggle-btn ${activeSeasonType === "corkum" ? "active" : ""}`} onClick={() => setActiveSeasonType("corkum")}>Corkum (Outdoor)</button>
              <button className={`vpll-toggle-btn ${activeSeasonType === "culkin" ? "active" : ""}`} onClick={() => culkinUnlocked && setActiveSeasonType("culkin")} disabled={!culkinUnlocked} style={!culkinUnlocked ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
                Culkin (Indoor) {!culkinUnlocked && "🔒"}
              </button>
            </div>

            {!seasons[activeSeasonType] && <div className="vpll-empty">No {SEASON_LABEL[activeSeasonType]} season in progress. Generate and complete a regular season first.</div>}
            {seasons[activeSeasonType] && !seasonCompleteFor(activeSeasonType) && (
              <div className="vpll-empty">
                Playoffs unlock once the {SEASON_LABEL[activeSeasonType]} regular season is complete.<br />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>{gamesPlayedFor(activeSeasonType)} / {totalGamesFor(activeSeasonType)} games played</span>
              </div>
            )}
            {seasons[activeSeasonType] && seasonCompleteFor(activeSeasonType) && !seasons[activeSeasonType].playoffs && (
              <div className="vpll-empty">
                <p style={{ margin: "0 0 14px 0" }}>{SEASON_LABEL[activeSeasonType]} regular season complete. Generate the 12-team-per-conference playoff bracket, seeded from final standings.</p>
                <button className="vpll-btn" onClick={() => generateBracket(activeSeasonType)}>Generate Playoff Bracket</button>
              </div>
            )}
            {seasons[activeSeasonType] && seasons[activeSeasonType].playoffs && (
              <>
                {seasons[activeSeasonType].playoffs.champion && (
                  <div className="vpll-champion-banner">
                    <span className="vpll-champion-label">{TROPHY_LABEL[activeSeasonType]} Champion</span>
                    <span className="vpll-champion-name">{seasons[activeSeasonType].playoffs.champion}</span>
                  </div>
                )}
                {nextPlayoffRoundFor(activeSeasonType) && (
                  <div className="vpll-controls-row">
                    <button className="vpll-btn" onClick={() => advancePlayoffRound(activeSeasonType, nextPlayoffRoundFor(activeSeasonType))} disabled={playoffBusy}>
                      {playoffBusy ? "Simulating…" : ROUND_LABELS[nextPlayoffRoundFor(activeSeasonType)]}
                    </button>
                  </div>
                )}

                <PlayoffRound title="Wild Card Round" games={seasons[activeSeasonType].playoffs.wildcard} roundKey="wildcard" seasonType={activeSeasonType} expandedGameKey={expandedGameKey} onGameClick={togglePlayoffBoxScore} boxScoreFor={playoffBoxScoreResultFor} />
                <PlayoffRound title="Regional Semifinals" games={seasons[activeSeasonType].playoffs.regionalSemis} roundKey="regionalSemis" seasonType={activeSeasonType} expandedGameKey={expandedGameKey} onGameClick={togglePlayoffBoxScore} boxScoreFor={playoffBoxScoreResultFor} />
                <PlayoffRound title="Regional Finals" games={seasons[activeSeasonType].playoffs.regionalFinal} roundKey="regionalFinal" seasonType={activeSeasonType} expandedGameKey={expandedGameKey} onGameClick={togglePlayoffBoxScore} boxScoreFor={playoffBoxScoreResultFor} />
                <PlayoffRound title="Conference Finals" games={seasons[activeSeasonType].playoffs.conferenceFinal} roundKey="conferenceFinal" seasonType={activeSeasonType} expandedGameKey={expandedGameKey} onGameClick={togglePlayoffBoxScore} boxScoreFor={playoffBoxScoreResultFor} />
                {seasons[activeSeasonType].playoffs.trophyFinal && (
                  <div className="vpll-week-block">
                    <div className="vpll-week-label">{TROPHY_LABEL[activeSeasonType]} Final (Best of 3)</div>
                    <div className="vpll-game-row" style={{ marginBottom: 8 }}>
                      <span className="matchup">{seasons[activeSeasonType].playoffs.trophyFinal.teamA} vs {seasons[activeSeasonType].playoffs.trophyFinal.teamB}</span>
                      <span className="played">{seasons[activeSeasonType].playoffs.trophyFinal.winsA}–{seasons[activeSeasonType].playoffs.trophyFinal.winsB}</span>
                    </div>
                    {seasons[activeSeasonType].playoffs.trophyFinal.games.map((g, i) => (
                      <div className="vpll-game-row" key={i}>
                        <span className="matchup">Game {i + 1}: {g.home} vs {g.away}</span>
                        <span className="played">{g.homeScore}–{g.awayScore}{g.ot ? " OT" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "standings" && (
          <section>
            {!seasons.corkum ? (
              <div className="vpll-empty">No season data yet. Generate and simulate a season from the Season tab to see standings.</div>
            ) : (
              <>
                <div className="vpll-info-banner">
                  Commissioners Cup Points: 1 point per regular season win, 2 points per playoff win, 0 for an OT loss.
                  The full-year Commissioners Cup combines both the Corkum and Culkin seasons.
                </div>
                <div className="vpll-toggle-group" style={{ marginBottom: 18 }}>
                  <button className={`vpll-toggle-btn ${standingsView === "combined" ? "active" : ""}`} onClick={() => setStandingsView("combined")}>Commissioners Cup (Combined)</button>
                  <button className={`vpll-toggle-btn ${standingsView === "cup" ? "active" : ""}`} onClick={() => setStandingsView("cup")}>Corkum</button>
                  <button className={`vpll-toggle-btn ${standingsView === "culkin" ? "active" : ""}`} onClick={() => setStandingsView("culkin")} disabled={!seasons.culkin}>Culkin</button>
                  <button className={`vpll-toggle-btn ${standingsView === "division" ? "active" : ""}`} onClick={() => setStandingsView("division")}>By Division</button>
                  <button className={`vpll-toggle-btn ${standingsView === "cap" ? "active" : ""}`} onClick={() => setStandingsView("cap")}>Salary Cap</button>
                </div>

                {standingsView === "combined" && (
                  <>
                    <div className="vpll-h2">Full-Year Commissioners Cup Standings</div>
                    {!seasons.culkin && <div className="vpll-info-banner">Culkin season hasn't started — totals currently reflect Corkum only.</div>}
                    <CombinedCupTable table={combinedCupStandings} teamList={TEAM_NAMES} />
                  </>
                )}

                {standingsView === "cap" && (
                  <>
                    <div className="vpll-h2">Salary Cap — Soft Cap {formatMoney(SALARY_CAP)}</div>
                    <div className="vpll-info-banner">Teams may exceed the cap but face escalating fines: 5-10% over → 25% of overage, 10-20% → 50%, 20-30% → 100%, 30%+ → 200%.</div>
                    <table className="vpll-standings-table">
                      <thead>
                        <tr><th>Team</th><th className="num">Roster</th><th className="num">Payroll</th><th className="num">% of Cap</th><th className="num">Fine</th></tr>
                      </thead>
                      <tbody>
                        {TEAM_NAMES.map((t) => teamPayroll(t)).length > 0 && TEAM_NAMES
                          .map((t) => ({ t, payroll: teamPayroll(t), roster: PLAYERS_RAW[t].length }))
                          .sort((a, b) => b.payroll - a.payroll)
                          .map((row) => {
                            const fine = capFine(row.payroll);
                            const pct = (row.payroll / SALARY_CAP) * 100;
                            return (
                              <tr key={row.t}>
                                <td>{row.t}</td>
                                <td className="num">{row.roster}</td>
                                <td className="num">{formatMoney(row.payroll)}</td>
                                <td className="num">{pct.toFixed(1)}%</td>
                                <td className="num cup-col">{fine > 0 ? formatMoney(fine) : "—"}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </>
                )}

                {standingsView === "cup" && (
                  <>
                    <div className="vpll-h2">Corkum Season — Commissioners Cup Points</div>
                    <StandingsTable table={seasonCupStandings("corkum")} teamList={TEAM_NAMES} />
                  </>
                )}

                {standingsView === "culkin" && seasons.culkin && (
                  <>
                    <div className="vpll-h2">Culkin Season — Commissioners Cup Points</div>
                    <StandingsTable table={seasonCupStandings("culkin")} teamList={TEAM_NAMES} />
                  </>
                )}

                {standingsView === "division" && (
                  <>
                    <div className="vpll-toggle-group" style={{ marginBottom: 14 }}>
                      <button className={`vpll-toggle-btn ${divisionSeason === "corkum" ? "active" : ""}`} onClick={() => setDivisionSeason("corkum")}>Corkum</button>
                      <button className={`vpll-toggle-btn ${divisionSeason === "culkin" ? "active" : ""}`} onClick={() => seasons.culkin && setDivisionSeason("culkin")} disabled={!seasons.culkin} style={!seasons.culkin ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
                        Culkin {!seasons.culkin && "🔒"}
                      </button>
                    </div>
                    {Object.entries(BY_DIVISION).map(([key, teams]) => {
                      const [conf, div] = key.split("|");
                      return (
                        <div key={key}>
                          <div className="vpll-div-header">{conf === "Lake" ? "Lakeshore" : "Mountainside"} — {div}</div>
                          <StandingsTable table={seasonCupStandings(divisionSeason)} teamList={teams} />
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "offseason" && (
          <section>
            {!bothTrophiesDecided && (
              <div className="vpll-empty">
                The offseason unlocks once both the Corkum and Culkin Trophy Finals are complete for Year {yearNumber}.
              </div>
            )}
            {bothTrophiesDecided && (
              <>
                <div className="vpll-champion-banner" style={{ marginBottom: 18 }}>
                  <span className="vpll-champion-label">Year {yearNumber} Complete</span>
                  <span className="vpll-champion-name" style={{ fontSize: 20 }}>
                    Corkum: {seasons.corkum.playoffs.champion} · Culkin: {seasons.culkin.playoffs.champion}
                  </span>
                </div>

                {/* 1. Draft */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">1. Draft Lottery &amp; Draft (5 Rounds)</div>
                  {!offseason.draft ? (
                    <button className="vpll-btn" onClick={runDraftStep} disabled={offseasonBusy}>
                      {offseasonBusy ? "Running…" : "Run Draft"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">
                        Draft order seeded from combined Commissioners Cup standings — weighted lottery for the bottom-16 teams determines picks 1-8, remaining lottery teams fill 9-16, the rest pick in straight inverse order. Teams draft for positional need ~60% of the time.
                      </div>
                      {[1, 2, 3, 4, 5].map((round) => (
                        <div key={round} style={{ marginBottom: 8 }}>
                          <div className="vpll-progress-label" style={{ marginBottom: 4 }}>Round {round}</div>
                          {offseason.draft.results.filter((p) => p.round === round).slice(0, round === 1 ? 32 : 8).map((p) => (
                            <div className="vpll-game-row" key={p.overallPick}>
                              <span className="matchup">Pick {p.overallPick} ({p.team}): {p.prospect.name}, {POS_NAME[p.prospect.pos]}, Age {p.prospect.age}</span>
                              <span className="played">OVR {p.prospect.overall} · Ceil {p.prospect.ceiling}</span>
                            </div>
                          ))}
                          {round > 1 && <div style={{ fontSize: 11, color: "var(--ink-soft)", fontFamily: "JetBrains Mono, monospace", padding: "4px 12px" }}>...showing first 8 of 32 picks this round</div>}
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* 2. Coaching */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">2. Coaching Carousel</div>
                  {!offseason.coaching ? (
                    <button className="vpll-btn" onClick={runCoachingStep} disabled={offseasonBusy || !offseason.draft}>
                      {offseasonBusy ? "Running…" : "Process Coaching Changes"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">{offseason.coaching.fired.length} of 32 Head Coach/GM seats turned over this offseason.</div>
                      {offseason.coaching.fired.map((f, i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup">{f.team}: {f.oldCoach} ({f.oldArch}) fired</span>
                          <span className="played">→ {offseason.coaching.hired[i]?.newCoach} ({offseason.coaching.hired[i]?.newArch})</span>
                        </div>
                      ))}
                      {offseason.coaching.fired.length === 0 && <div style={{ fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-soft)", padding: "6px 12px" }}>Every coach kept their job this offseason.</div>}
                    </>
                  )}
                </div>

                {/* 3. Retirement */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">3. Retirement Wire</div>
                  {!offseason.retirement ? (
                    <button className="vpll-btn" onClick={runRetirementStep} disabled={offseasonBusy || !offseason.coaching}>
                      {offseasonBusy ? "Running…" : "Process Retirements"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">{offseason.retirement.retirees.length} players announced their retirement league-wide.</div>
                      {offseason.retirement.retirees.map((r, i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup">{r.name} ({POS_NAME[r.pos]}, {r.team})</span>
                          <span className="played">Age {r.age}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* 4. Free Agency */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">4. Free Agency</div>
                  {!offseason.freeAgency ? (
                    <button className="vpll-btn" onClick={runFreeAgencyStep} disabled={offseasonBusy || !offseason.retirement}>
                      {offseasonBusy ? "Running…" : "Run Free Agency"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">
                        {offseason.freeAgency.reSigned.length} re-signed · {offseason.freeAgency.signed.length} changed teams · {offseason.freeAgency.departed.length} released.
                        Players acted as Loyalists ({offseason.freeAgency.reSigned.filter(s => s.motivation === "Loyalist").length}), Mercenaries ({offseason.freeAgency.signed.filter(s => s.motivation === "Mercenary").length} signings), and Winners ({offseason.freeAgency.signed.filter(s => s.motivation === "Winner").length} signings).
                      </div>
                      {offseason.freeAgency.signed.length > 0 && (
                        <>
                          <div className="vpll-progress-label" style={{ margin: "8px 0 4px" }}>Signings</div>
                          {offseason.freeAgency.signed.map((s, i) => (
                            <div className="vpll-game-row" key={i}>
                              <span className="matchup">{s.name} (OVR {s.ovr}, {s.motivation}): {s.from} → {s.team}</span>
                              <span className="played">{formatMoney(s.aav)}/yr</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* 5. Trades */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">5. Trades</div>
                  {!offseason.trades ? (
                    <button className="vpll-btn" onClick={runTradesStep} disabled={offseasonBusy || !offseason.freeAgency}>
                      {offseasonBusy ? "Running…" : "Run Trade Window"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">
                        {offseason.trades.trades.length} trades executed league-wide.
                        {offseason.trades.trades.filter(t => t.reason.includes("requested")).length > 0 && ` ${offseason.trades.trades.filter(t => t.reason.includes("requested")).length} initiated by unhappy star trade demands.`}
                      </div>
                      {offseason.trades.trades.map((t, i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup">{t.teamA}: {t.playerA} ↔ {t.teamB}: {t.playerB}</span>
                          <span className="played" style={{ fontSize: 11, maxWidth: 220, textAlign: "right" }}>{t.reason}</span>
                        </div>
                      ))}
                      {offseason.trades.trades.length === 0 && <div style={{ fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-soft)", padding: "6px 12px" }}>A quiet trade window — no deals made.</div>}
                    </>
                  )}
                </div>

                {/* Manual Trade Override */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">Commissioner's Trade Override</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                    <div>
                      <select className="vpll-select" value={manualTeamA} onChange={(e) => { setManualTeamA(e.target.value); setManualPlayerA(""); }}>
                        {TEAM_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select className="vpll-select" style={{ marginTop: 6 }} value={manualPlayerA} onChange={(e) => setManualPlayerA(e.target.value)}>
                        <option value="">Select player…</option>
                        {PLAYERS_RAW[manualTeamA].map((p) => <option key={p[0]} value={p[0]}>{p[0]} ({POS_NAME[p[1]]}, OVR {p[4]})</option>)}
                      </select>
                    </div>
                    <div>
                      <select className="vpll-select" value={manualTeamB} onChange={(e) => { setManualTeamB(e.target.value); setManualPlayerB(""); }}>
                        {TEAM_NAMES.filter((t) => t !== manualTeamA).map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select className="vpll-select" style={{ marginTop: 6 }} value={manualPlayerB} onChange={(e) => setManualPlayerB(e.target.value)}>
                        <option value="">Select player…</option>
                        {PLAYERS_RAW[manualTeamB].map((p) => <option key={p[0]} value={p[0]}>{p[0]} ({POS_NAME[p[1]]}, OVR {p[4]})</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="vpll-controls-row">
                    <button className="vpll-btn secondary" onClick={executeManualTrade} disabled={!manualPlayerA || !manualPlayerB}>Execute Trade</button>
                    {manualTradeMsg && <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-soft)" }}>{manualTradeMsg}</span>}
                  </div>
                </div>

                {/* 6. Team Rating Progression (runs last, after all roster transactions) */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">6. Team Rating Progression</div>
                  {!offseason.progression ? (
                    <button className="vpll-btn" onClick={runProgressionStep} disabled={offseasonBusy || !offseason.trades}>
                      {offseasonBusy ? "Running…" : "Apply Progression"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">
                        Team ratings updated based on Year {yearNumber} performance, roster composition, and player development.
                        {offseason.progression.developments && offseason.progression.developments.length > 0 && ` ${offseason.progression.developments.filter(d => d.hit).length} players improved, ${offseason.progression.developments.filter(d => !d.hit).length} stagnated or declined.`}
                      </div>
                      {offseason.progression.results.sort((a, b) => b.delta - a.delta).map((r, i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup">{r.team}{r.tagChanged ? ` — ${r.oldTag} → ${r.newTag}` : ""}</span>
                          <span className="played">{r.oldScore} → {r.newScore} ({r.delta > 0 ? "+" : ""}{r.delta})</span>
                        </div>
                      ))}
                      {offseason.progression.developments && offseason.progression.developments.length > 0 && (
                        <>
                          <div className="vpll-progress-label" style={{ margin: "12px 0 4px" }}>Player Development</div>
                          {offseason.progression.developments.slice(0, 15).map((d, i) => (
                            <div className="vpll-game-row" key={i}>
                              <span className="matchup">{d.name} ({d.team})</span>
                              <span className="played">{d.from} → {d.to} {d.hit ? "📈" : "📉"}</span>
                            </div>
                          ))}
                          {offseason.progression.developments.length > 15 && <div style={{ fontSize: 11, color: "var(--ink-soft)", fontFamily: "JetBrains Mono, monospace", padding: "4px 12px" }}>...and {offseason.progression.developments.length - 15} more</div>}
                        </>
                      )}
                    </>
                  )}
                </div>

                {allOffseasonStepsComplete && (
                  <div className="vpll-controls-row" style={{ marginTop: 20 }}>
                    <button className="vpll-btn" onClick={beginYear2}>Begin Year {yearNumber + 1}</button>
                  </div>
                )}
              </>
            )}

            {yearHistory.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div className="vpll-section-label">League History</div>
                {yearHistory.slice().reverse().map((h, i) => (
                  <div className="vpll-history-item" key={i} style={{ marginBottom: 6 }}>
                    <span>Year {h.year}: Corkum — {h.corkumChampion} · Culkin — {h.culkinChampion}</span>
                    <span className="vpll-history-score">Cup: {h.cupChampion}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px dashed var(--line)" }}>
              <div className="vpll-section-label">Danger Zone</div>
              {!confirmReset ? (
                <button className="vpll-btn secondary" onClick={() => setConfirmReset(true)}>Reset League to Year 1</button>
              ) : (
                <div className="vpll-info-banner" style={{ borderColor: "var(--barn)" }}>
                  This wipes every team rating, coach, roster, contract, and season back to the original Year 1 embedded state — all progression, trades, drafts, and history are gone for good.
                  <div className="vpll-controls-row" style={{ marginTop: 10 }}>
                    <button className="vpll-btn" style={{ background: "var(--barn)", color: "var(--white)" }} onClick={resetLeagueToYear1}>Yes, Reset Everything</button>
                    <button className="vpll-btn secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "pressbox" && (
          <section>
            <div className="vpll-section-label">Generate a Game Recap</div>
            {pressGameOptions.length === 0 ? (
              <div className="vpll-empty">No games on the wire yet. Simulate some season or playoff games and the beat writers will get to work.</div>
            ) : (
              <>
                <div className="vpll-controls-row">
                  <select className="vpll-select" style={{ maxWidth: 480 }} value={pressSelection} onChange={(e) => setPressSelection(e.target.value)}>
                    <option value="">Select a played game…</option>
                    {pressGameOptions.map((grp) => (
                      <optgroup key={grp.group} label={grp.group}>
                        {grp.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="vpll-controls-row">
                  <div className="vpll-toggle-group">
                    {["VPLL.com", "The Mesh", "The X"].map((o) => (
                      <button key={o} className={`vpll-toggle-btn ${pressOutlet === o ? "active" : ""}`} onClick={() => setPressOutlet(o)}>{o}</button>
                    ))}
                  </div>
                  <button className="vpll-btn" onClick={generateGameRecap} disabled={pressGenerating || !pressSelection}>
                    {pressGenerating ? "Writing…" : "Write the Story"}
                  </button>
                </div>
              </>
            )}

            {(seasons.corkum || seasons.culkin) && (
              <>
                <div className="vpll-section-label" style={{ marginTop: 24 }}>Week in Review</div>
                <div className="vpll-controls-row">
                  <div className="vpll-toggle-group">
                    <button className={`vpll-toggle-btn ${weekReviewSeasonType === "corkum" ? "active" : ""}`} onClick={() => setWeekReviewSeasonType("corkum")} disabled={!seasons.corkum}>Corkum</button>
                    <button className={`vpll-toggle-btn ${weekReviewSeasonType === "culkin" ? "active" : ""}`} onClick={() => setWeekReviewSeasonType("culkin")} disabled={!seasons.culkin}>Culkin</button>
                  </div>
                  <button className="vpll-btn secondary" onClick={generateWeekInReview} disabled={pressGenerating || latestCompletedWeek(weekReviewSeasonType) === null}>
                    {pressGenerating ? "Writing…" : latestCompletedWeek(weekReviewSeasonType) ? `Write Week ${latestCompletedWeek(weekReviewSeasonType)} Recap` : "No completed week yet"}
                  </button>
                </div>
              </>
            )}

            {bothTrophiesDecided && (offseason.draft || offseason.coaching || offseason.retirement || offseason.progression) && (
              <>
                <div className="vpll-section-label" style={{ marginTop: 24 }}>Offseason Coverage</div>
                <div className="vpll-controls-row">
                  <button className="vpll-btn secondary" onClick={generateHotStoveColumn} disabled={pressGenerating}>
                    {pressGenerating ? "Writing…" : "Generate Hot Stove Column"}
                  </button>
                </div>
              </>
            )}

            {pressError && <div className="vpll-press-error">{pressError}</div>}

            {pressArchive.length > 0 && (
              <>
                <div className="vpll-section-label" style={{ marginTop: 24 }}>The Archive</div>
                {pressArchive.map((a, i) => <Article key={a.timestamp || i} article={a} />)}
              </>
            )}
            {pressArchive.length === 0 && !pressError && (
              <div className="vpll-empty" style={{ marginTop: 20 }}>Nothing in the archive yet. Every article generated here gets filed away.</div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
