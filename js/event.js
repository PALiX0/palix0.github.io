
        async function fetchCSV(url) {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Failed to load CSV: ${url}`);
                return [];
            }
            const text = await response.text();
            return parseCSV(text);
        }

        function parseCSV(data) {
            const rows = data.split("\n").map(row => row.trim()).filter(row => row !== "");
            const headers = rows[0].split(",").map(header => header.trim());
            const dataRows = rows.slice(1);
            const rankIndex = headers.indexOf("Rank");
            const driverIndex = headers.indexOf("DisplayName");
            const timeIndex = headers.indexOf("Time");
            const platformIndex = headers.indexOf("Platform");
            const penaltyTimeIndex = headers.indexOf("TimePenalty");
            const vehicleIndex = headers.indexOf("Vehicle");

            if (rankIndex === -1 || driverIndex === -1 || timeIndex === -1) {
                console.error("Required columns are missing from the CSV file.");
                return [];
            }

            return dataRows.map(row => {
                const cells = row.split(",").map(cell => cell.trim());
                return {
                    rank: parseInt(cells[rankIndex], 10),
                    driver: cells[driverIndex],
                    time: cells[timeIndex],
                    penaltyTime: penaltyTimeIndex !== -1 ? cells[penaltyTimeIndex] : "00:00:00.000", // Default if missing
                    platform: cells[platformIndex] || "Unknown",
                    vehicle: vehicleIndex !== -1 ? cells[vehicleIndex] : "Unknown" // Extract vehicle, default if missing
                };
            }).filter(row => row.rank && row.driver && row.time);
        }



function isTerminalDamageTime(time) {
    const terminalDamageTimes = ["00:08:00", "00:16:00", "00:25:00"];
    return terminalDamageTimes.includes(time.trim());
}
        
function parseTimeToSeconds(time) {
    if (!time || typeof time !== "string") {
        console.warn(`Invalid time value: "${time}"`);
        return 0;
    }

    // Ensure the time string matches the expected format
    const timeRegex = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/;
    const matches = time.match(timeRegex);

    if (!matches) {
        console.warn(`Unexpected time format: "${time}"`);
        return 0;
    }

    const [hh, mm, ss, ms = "0"] = matches.slice(1);

    // If milliseconds are not provided, default to 0
    return (
        parseInt(hh, 10) * 3600 +
        parseInt(mm, 10) * 60 +
        parseInt(ss, 10) +
        parseFloat(`0.${ms}`)
    );
}

        function formatTimeDiffToFirst(totalSeconds) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = (totalSeconds % 60).toFixed(3);
            return `+${String(minutes).padStart(2, "0")}:${String(seconds).padStart(6, "0")}`;
        }
        function formatSecondsToTime(totalSeconds) {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = (totalSeconds % 60).toFixed(3);
            return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(6, "0")}`;
        }

        function toggleNoDataMessage(show) {
            const noDataElement = document.getElementById("no-data-message");
            if (noDataElement) {
                noDataElement.style.display = show ? "block" : "none"; // Show or hide message
            }
        }        
        async function listCSVFiles() {
            try {
                // Get the parent folder name dynamically
                const clubFolder = location.pathname.split("/").slice(-5, -4)[0];
                const champFolder = location.pathname.split("/").slice(-3, -2)[0];
                const eventFolder = location.pathname.split("/").slice(-2, -1)[0];
                const response = await fetch(`/${clubFolder}/csv/${champFolder}/${eventFolder}/file_list.json`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const files = await response.json();
                document.getElementById("debugInfo").innerText = `Found ${files.length} CSV file(s).`;
                toggleNoDataMessage(files.length === 0);
                return files.map(file => `/${clubFolder}/csv/${champFolder}/${eventFolder}/${file}`);
            } catch (error) {
                document.getElementById("debugInfo").innerText = `Error loading file list: ${error.message}`;
                console.error("Error loading file_list.json:", error);
                toggleNoDataMessage(true);
                return [];  
            }
        }


async function fetchBannedPlayers() {
    try {
        const response = await fetch("/banned_players.json");
        if (!response.ok) {
            console.error("Failed to load banned players list.");
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Error loading banned players list:", error);
        return [];
    }
}        

    // Load the rallies and championship event data
    async function loadRallyData() {
      const ralliesResponse = await fetch('/rally_titles.json');
      const rallies = await ralliesResponse.json();
      const clubFolder = location.pathname.split("/").slice(-5, -4)[0];
      const champFolder = location.pathname.split("/").slice(-3, -2)[0];
      const eventFolder = location.pathname.split("/").slice(-2, -1)[0];
      const eventsResponse = await fetch(`/${clubFolder}/html/${champFolder}/events.json`);
      const events = await eventsResponse.json();

      const eventNumber = eventFolder.replace("Ev_", ""); // Remove "Ev_" from folder name
      // Get the country code for the current event (e.g., 'lt' for Ev_01)
      const countryCode = events[eventFolder];

        // Fetch the pointsCSV filename for the championship
        window.pointsCSV = events.pointsCSV || "points_top20"; // Fallback if not set

      // Get rally data using the country code
      const rally = rallies[countryCode];

      // Set rally header content dynamically
        const rallyHeader = document.getElementById('rally-header');
      // Set rally name and flag in the HTML
      if (rally) {
        const flagImage = `<img src="${rally.flagUrl}" alt="${rally.rallyName} Flag" width="40" height="30" style="vertical-align: middle;">`;
        rallyHeader.innerHTML = `${eventNumber} • ${flagImage} ${rally.rallyName}`;
    } else {
        console.error('Rally not found for this event!');
        rallyHeader.textContent = `Event ${eventNumber}`;
    }
    }

    async function fetchPointsMap() {
        const response = await fetch(`/points/${window.pointsCSV}.csv`);
        if (!response.ok) {
            console.error("Failed to load points map.");
            return {};
        }
        const text = await response.text();
        return text.split("\n").reduce((map, line) => {
            const [position, points] = line.split(",").map(x => parseInt(x, 10));
            if (!isNaN(position) && !isNaN(points)) {
                map[position] = points;
            }
            return map;
        }, {});
    }

async function generateStandings() {
    const files = await listCSVFiles();
    const pointsMap = await fetchPointsMap();
    const bannedPlayers = await fetchBannedPlayers(); // Fetch banned players
    const standings = {};
    const lastStageResults = await fetchCSV(files[files.length - 1]);
    const powerStagePoints = [5, 4, 3, 2, 1];

    // Process each stage file
    for (const file of files) {
        const stageResults = await fetchCSV(file);
stageResults.forEach(({ rank, driver, vehicle, time, platform, penaltyTime }) => {
    if (bannedPlayers.includes(driver)) return; // Skip banned players
    const totalSeconds = parseTimeToSeconds(time);
    const penaltySeconds = penaltyTime ? parseTimeToSeconds(penaltyTime) : 0;

    // Ensure driver data exists in standings
    if (!standings[driver]) {
        standings[driver] = {
            totalTime: 0,
            penaltyTime: 0,
            stagesCompleted: 0,
            dnf: false,
            platform,
            vehicle,
        };
    }

    const driverData = standings[driver];

    if (isTerminalDamageTime(time)) {
        // Handle terminal damage case
        driverData.totalTime += totalSeconds; // Add the terminal damage time
        driverData.dnf = true; // Mark driver as DNF
    //    driverData.penaltyTime += penaltySeconds; // Include any penalties from the CSV
        driverData.displayPenaltyTime = (driverData.displayPenaltyTime || 0) + totalSeconds;
        driverData.stagesCompleted += 1; // Count as a completed stage
    } else {
        // Normal case: add time and penalties
        driverData.totalTime += totalSeconds;
     //   driverData.penaltyTime += penaltySeconds;
        driverData.displayPenaltyTime = (driverData.displayPenaltyTime || 0) + penaltySeconds;
        driverData.stagesCompleted += 1;
    }
});
    }

// Apply penalties for missed stages
const totalStages = files.length;
for (const driver in standings) {
    const data = standings[driver];
    const missedStages = totalStages - data.stagesCompleted;

    if (missedStages > 0) {
        const missedPenalty = missedStages * 1800; // 30 minutes per missed stage
        data.totalTime += missedPenalty; // Add missed stage penalty to total time
        data.penaltyTime += missedPenalty; // Add missed stage penalty to total penalty
        data.dnf = true; // Mark as DNF if stages are missed
    }
}

    // Sort standings, keeping DNFs at the bottom
let sortedStandings = Object.entries(standings)
    .sort(([, a], [, b]) => {
        if (a.dnf && b.dnf) {
            // Both are DNFs: sort by total time
            return a.totalTime - b.totalTime;
        }
        if (a.dnf) return 1; // Move DNFs to the bottom
        if (b.dnf) return -1; // Move DNFs to the bottom
        // Sort non-DNFs by total time only
        return a.totalTime - b.totalTime;
    });

    // Get the best total time to calculate time difference to first
    const bestTotalTime = sortedStandings.find(([, data]) => !data.dnf)?.[1]?.totalTime || 0;

    /// Map driver data to standings
sortedStandings = sortedStandings.map(([driver, data], index) => ({
    position: index + 1,
    driver,
    vehicle: data.vehicle,
    totalTime: formatSecondsToTime(data.totalTime), // Use only the stage times directly
    timeDiff: data.dnf
        ? formatTimeDiffToFirst(data.totalTime - bestTotalTime)
        : formatTimeDiffToFirst(data.totalTime - bestTotalTime),
  //  totalPenalty: formatSecondsToTime(data.penaltyTime), // Display penalties separately
    totalPenalty: formatTimeDiffToFirst(data.displayPenaltyTime || data.penaltyTime), // Use the display tracker
    stagesCompleted: data.stagesCompleted,
    platform: data.platform,
    dnf: data.dnf ? "DNF" : "",
    eventPoints: data.dnf ? 0 : pointsMap[index + 1] || 0,
    powerStagePoints: lastStageResults.find(r => r.driver === driver)?.rank <= 5
        ? powerStagePoints[lastStageResults.find(r => r.driver === driver).rank - 1]
        : 0
}));

    // Render standings in the table
    const tbody = document.querySelector("#standings tbody");
    tbody.innerHTML = "";
    sortedStandings.forEach(({ position, driver, totalTime, timeDiff, totalPenalty, stagesCompleted, platform, dnf, eventPoints, powerStagePoints, vehicle }) => {
        let rowClass = ""; // Default row class
        // Assign classes based on position for first, second, and third
        if (dnf === "DNF") {
            rowClass = "dnf"; // dnf
        } else if (position === 1) {
            rowClass = "first-place"; // Gold for first place
        } else if (position === 2) {
            rowClass = "second-place"; // Silver for second place
        } else if (position === 3) {
            rowClass = "third-place"; // Bronze for third place
        } else if (position >= 4 && position <= 10) {
         rowClass = "top-ten"; // Custom style for positions 4 to 10
        } else if (position >= 11 && position <= 20) {
         rowClass = "top-twenty"; // Custom style for positions 4 to 10
        } else {
            rowClass = "below-twenty"; // Custom style for positions 4 to 10
        }
        const row = `<tr class="${rowClass}">
            <td>${position}</td>
            <td class="driver">${driver}</td>
            <td>${vehicle}</td>
            <td>${totalTime}</td>
            <td>${timeDiff}</td>
            <td>${totalPenalty}</td>
            <td>${stagesCompleted}</td>
            <td>${platform}</td>
            <td>${dnf}</td>
            <td>${eventPoints}</td>
            <td>${powerStagePoints}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}


        async function main() {
            await generateStandings();

        }
        
        window.onload = async function () {
            await loadRallyData();
            await main();
        };
        