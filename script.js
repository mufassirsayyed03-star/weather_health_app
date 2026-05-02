let cityInput = document.getElementById('city_input');
let btn = document.getElementById('submit_btn');
let resultDiv = document.getElementById('weather-result');
let forecastContainer = document.getElementById('forecast-container');

const api_key = "6a4e87aed29f15892fbb781fd257715f";

// Global variables
let currentHourlyData = null;
let currentDailyData = null;
let activeTab = 'daily';
let currentWeatherData = null;
let currentUVData = null;

// Helper functions
function getWeekday(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function formatTime(dt_txt) {
    const date = new Date(dt_txt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getWeatherEmoji(description) {
    if (!description) return '🌡️';
    const desc = description.toLowerCase();
    if (desc.includes('clear')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain')) return '🌧️';
    if (desc.includes('drizzle')) return '🌦️';
    if (desc.includes('thunder')) return '⛈️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('mist') || desc.includes('fog')) return '🌫️';
    return '🌤️';
}

// ==================== 🌤️ HEALTH METER FUNCTIONS ====================

// 1. ☀️ UV Index & Sun Safety
function getUVHealthAdvice(uvIndex) {
    if (!uvIndex) return { risk: 'unknown', safeMinutes: 'N/A', advice: 'UV data not available', color: '#94a3b8', emoji: '🌤️' };
    
    if (uvIndex <= 2) {
        return { risk: 'Low', safeMinutes: 'Unlimited', advice: 'No protection needed. Enjoy outdoor activities freely!', color: '#22c55e', emoji: '🟢' };
    } else if (uvIndex <= 5) {
        return { risk: 'Moderate', safeMinutes: '45-60 min', advice: 'Apply SPF 30+ sunscreen. Wear sunglasses and hat.', color: '#eab308', emoji: '🟡' };
    } else if (uvIndex <= 7) {
        return { risk: 'High', safeMinutes: '20-30 min', advice: 'Avoid sun between 10AM-4PM. Use SPF 50+. Seek shade.', color: '#f97316', emoji: '🟠' };
    } else if (uvIndex <= 10) {
        return { risk: 'Very High', safeMinutes: '10-15 min', advice: 'Stay indoors if possible. Cover fully, use umbrella.', color: '#ef4444', emoji: '🔴' };
    } else {
        return { risk: 'Extreme', safeMinutes: '5 min or less', advice: 'DANGER! Do not go out without full protection. Stay indoors.', color: '#8b5cf6', emoji: '⚫' };
    }
}

// 2. 🌡️ Heat Index / Heat Stress
function calculateHeatIndex(tempC, humidity) {
    const tempF = (tempC * 9/5) + 32;
    let hi = 0.5 * (tempF + 61.0 + ((tempF - 68.0) * 1.2) + (humidity * 0.094));
    if (hi < 80) return tempF;
    hi = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
    return (hi - 32) * 5/9;
}

function getHeatHealthAdvice(tempC, humidity) {
    const heatIndex = calculateHeatIndex(tempC, humidity);
    const hiC = Math.round(heatIndex);
    
    if (tempC <= 20) {
        return { level: 'Comfortable', advice: 'Perfect temperature! Enjoy your day.', waterIntake: '2-2.5L', activity: 'All outdoor activities safe', color: '#22c55e', emoji: '😊' };
    } else if (tempC <= 27) {
        return { level: 'Warm', advice: 'Stay hydrated. Light clothing recommended.', waterIntake: '2.5-3L', activity: 'Outdoor activities fine but take breaks', color: '#eab308', emoji: '🌡️' };
    } else if (tempC <= 33) {
        return { level: 'Hot', advice: 'Heat possible. Avoid heavy exercise. Use fan/AC.', waterIntake: '3-3.5L', activity: 'Limit outdoor activity 11AM-3PM', color: '#f97316', emoji: '🔥' };
    } else if (tempC <= 40) {
        return { level: 'Very Hot', advice: 'Heat cramps possible. Stay in shade. Drink electrolytes.', waterIntake: '3.5-4L', activity: 'Avoid outdoor exertion', color: '#ef4444', emoji: '🥵' };
    } else {
        return { level: 'Extreme Heat', advice: 'DANGER! Heat stroke risk. Stay indoors. Emergency cooling needed.', waterIntake: '4L+ with electrolytes', activity: 'NO outdoor activity', color: '#8b5cf6', emoji: '⚠️' };
    }
}

// 3. ❄️ Cold Stress Safety
function getColdHealthAdvice(tempC, windSpeed) {
    let windChill = tempC;
    if (tempC <= 10 && windSpeed > 5) {
        windChill = 13.12 + 0.6215 * tempC - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * tempC * Math.pow(windSpeed, 0.16);
        windChill = Math.round(windChill);
    }
    
    if (tempC >= 15) {
        return { level: 'Warm', advice: 'No cold protection needed.', clothing: 'Light clothing', frostbiteRisk: 'None', color: '#22c55e', emoji: '☀️' };
    } else if (tempC >= 10) {
        return { level: 'Cool', advice: 'Light jacket recommended for evening.', clothing: 'Light jacket, jeans', frostbiteRisk: 'None', color: '#eab308', emoji: '🍂' };
    } else if (tempC >= 0) {
        return { level: 'Cold', advice: 'Wear sweater and closed shoes. Cover ears.', clothing: 'Sweater, jacket, cap', frostbiteRisk: 'Low (30+ min exposure)', color: '#f97316', emoji: '🧥' };
    } else if (tempC >= -10) {
        return { level: 'Very Cold', advice: 'Layer up! Wear gloves and warm cap. Limit time outside.', clothing: 'Thermal, heavy jacket, gloves, muffler', frostbiteRisk: 'Moderate (15-30 min)', color: '#ef4444', emoji: '❄️' };
    } else {
        return { level: 'Extreme Cold', advice: 'DANGER! Frostbite risk in 10 min. Stay indoors.', clothing: 'Full winter gear + multiple layers', frostbiteRisk: 'High (under 10 min)', color: '#8b5cf6', emoji: '🥶' };
    }
}

// 4. 🌧️ Rain Health Advisory
function getRainHealthAdvice(precipitation, humidity) {
    if (precipitation === 0) {
        if (humidity > 70) return { risk: 'Humid', advice: 'High humidity. Stay hydrated. Use AC if possible.', umbrellaLikely: false, color: '#eab308', emoji: '💧' };
        return { risk: 'No Rain', advice: 'No rain expected. Enjoy dry weather!', umbrellaLikely: false, color: '#22c55e', emoji: '☀️' };
    } else if (precipitation < 5) {
        return { risk: 'Light Rain', advice: 'Light drizzle possible. Carry small umbrella.', umbrellaLikely: true, color: '#eab308', emoji: '🌦️' };
    } else if (precipitation < 20) {
        return { risk: 'Moderate Rain', advice: 'Rain expected. Use umbrella/raincoat. Avoid getting wet to prevent cold.', umbrellaLikely: true, color: '#f97316', emoji: '🌧️' };
    } else if (precipitation < 50) {
        return { risk: 'Heavy Rain', advice: 'Heavy rainfall! Stay indoors if possible. Risk of cold/flu if wet.', umbrellaLikely: true, color: '#ef4444', emoji: '⛈️' };
    } else {
        return { risk: 'Extreme Rain', advice: 'DANGER! Flood risk. Do NOT go out. Stay safe indoors.', umbrellaLikely: true, color: '#8b5cf6', emoji: '🌊' };
    }
}

// 5. 💨 Wind Safety
function getWindHealthAdvice(windSpeed) {
    if (windSpeed < 15) {
        return { risk: 'Light Breeze', advice: 'Pleasant wind. No safety concerns.', outdoorSafe: true, color: '#22c55e', emoji: '🍃' };
    } else if (windSpeed < 30) {
        return { risk: 'Moderate Wind', advice: 'Hold onto loose items. Hair may get messy.', outdoorSafe: true, color: '#eab308', emoji: '💨' };
    } else if (windSpeed < 50) {
        return { risk: 'Strong Wind', advice: 'Difficult for walking/cycling. Secure outdoor items.', outdoorSafe: 'Caution', color: '#f97316', emoji: '🌬️' };
    } else if (windSpeed < 70) {
        return { risk: 'Very Strong', advice: 'Avoid going out. Risk of falling objects.', outdoorSafe: false, color: '#ef4444', emoji: '🌪️' };
    } else {
        return { risk: 'Storm Warning', advice: 'DANGER! Stay indoors immediately. Storm conditions.', outdoorSafe: false, color: '#8b5cf6', emoji: '⚠️' };
    }
}

// 6. 👕 Smart Clothing Advisor
function getClothingAdvice(tempC, rain, windSpeed) {
    let clothing = [];
    let accessories = [];
    
    if (tempC > 30) {
        clothing = ['Cotton T-shirt', 'Shorts/Light pants'];
        accessories = ['Cap', 'Sunglasses', 'Sunscreen'];
    } else if (tempC > 25) {
        clothing = ['Cotton shirt', 'Jeans/Cotton pants'];
        accessories = ['Light cap'];
    } else if (tempC > 20) {
        clothing = ['Full sleeves shirt', 'Light jacket optional'];
        accessories = [];
    } else if (tempC > 15) {
        clothing = ['Sweater', 'Jeans', 'Light jacket'];
        accessories = ['Light scarf'];
    } else if (tempC > 5) {
        clothing = ['Thermal inner', 'Heavy sweater', 'Warm jacket', 'Woolen cap'];
        accessories = ['Gloves', 'Muffler'];
    } else {
        clothing = ['Multiple layers', 'Heavy winter jacket', 'Thermal set', 'Woolen cap'];
        accessories = ['Gloves', 'Thick muffler', 'Warm socks'];
    }
    
    if (rain > 0) {
        clothing.push('Raincoat or Carry umbrella');
    }
    
    if (windSpeed > 30) {
        clothing.push('Windcheater jacket');
        accessories.push('Head cap');
    }
    
    return { clothing, accessories };
}

// 7. 💧 Hydration Reminder
function getHydrationAdvice(tempC, humidity) {
    let baseWater = 2.5;
    
    if (tempC < 20) baseWater = 2.2;
    else if (tempC < 30) baseWater = 2.8;
    else if (tempC < 35) baseWater = 3.2;
    else if (tempC < 40) baseWater = 3.8;
    else baseWater = 4.5;
    
    if (humidity > 70) baseWater += 0.3;
    if (humidity < 30) baseWater += 0.2;
    
    return {
        liters: baseWater.toFixed(1),
        glasses: Math.round(baseWater * 4),
        advice: `Drink ${baseWater.toFixed(1)}L (${Math.round(baseWater * 4)} glasses) today. ${tempC > 30 ? 'Take electrolytes if sweating.' : 'Water is sufficient.'}`
    };
}

// 8. 📅 Activity Planner
function getActivityPlanner(tempC, uvIndex, rain, windSpeed) {
    return {
        morning: (tempC < 30 && uvIndex < 5 && rain < 5) ? '✅ Safe' : '⚠️ Caution',
        afternoon: (tempC > 33 || uvIndex > 6 || rain > 10) ? '❌ Avoid' : (tempC > 28 ? '⚠️ Limited' : '✅ Safe'),
        evening: (tempC > 25 && rain < 10) ? '✅ Safe' : '⚠️ Check conditions',
        night: (tempC > 12) ? '✅ Safe' : '⚠️ Wear warm clothes'
    };
}

// ==================== 🎨 RENDER HEALTH DASHBOARD ====================

function renderHealthDashboard(data, uvIndex, lat, lon) {
    const temp = data.main.temp;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const rain = data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0;
    const precipitation = rain;
    
    const uvHealth = getUVHealthAdvice(uvIndex);
    const heatHealth = getHeatHealthAdvice(temp, humidity);
    const coldHealth = getColdHealthAdvice(temp, windSpeed);
    const rainHealth = getRainHealthAdvice(precipitation, humidity);
    const windHealth = getWindHealthAdvice(windSpeed);
    const hydration = getHydrationAdvice(temp, humidity);
    const clothing = getClothingAdvice(temp, precipitation, windSpeed);
    const activity = getActivityPlanner(temp, uvIndex || 0, precipitation, windSpeed);
    
    return `
        <div class="health-dashboard">
            <div class="health-header">
                <h3>🏥 Weather Health Advisor</h3>
                <p>Personalized recommendations based on today's weather</p>
            </div>
            
            <div class="simple-health-card">
                <div class="simple-card-title">📋 Today's Quick Health Guide</div>
                <div class="simple-card-content">
                    <span>☀️ Safe in sun: ${uvHealth.safeMinutes}</span>
                    <span>🧥 ${coldHealth.clothing.split(',')[0]}</span>
                    <span>💧 Drink ${hydration.liters}L water</span>
                    <span>${activity.morning.includes('Safe') ? '🏃 Morning: Good' : '🏃 Morning: Caution'}</span>
                </div>
            </div>
            
            <div class="health-grid">
                <div class="health-card" style="border-left-color: ${uvHealth.color}">
                    <div class="health-card-title">☀️ UV Index: ${uvIndex || 'N/A'} ${uvHealth.emoji}</div>
                    <div class="health-risk" style="color: ${uvHealth.color}">Risk: ${uvHealth.risk}</div>
                    <div class="health-advice">🕐 Safe sun exposure: ${uvHealth.safeMinutes}</div>
                    <div class="health-advice">📝 ${uvHealth.advice}</div>
                </div>
                
                <div class="health-card" style="border-left-color: ${heatHealth.color}">
                    <div class="health-card-title">🌡️ Heat Index: ${Math.round(calculateHeatIndex(temp, humidity))}°C ${heatHealth.emoji}</div>
                    <div class="health-risk" style="color: ${heatHealth.color}">Level: ${heatHealth.level}</div>
                    <div class="health-advice">📝 ${heatHealth.advice}</div>
                    <div class="health-advice">💧 ${heatHealth.waterIntake} water recommended</div>
                </div>
                
                <div class="health-card" style="border-left-color: ${coldHealth.color}">
                    <div class="health-card-title">❄️ Cold Risk ${coldHealth.emoji}</div>
                    <div class="health-risk" style="color: ${coldHealth.color}">Level: ${coldHealth.level}</div>
                    <div class="health-advice">📝 ${coldHealth.advice}</div>
                    <div class="health-advice">🧣 ${coldHealth.clothing}</div>
                </div>
                
                <div class="health-card" style="border-left-color: ${rainHealth.color}">
                    <div class="health-card-title">🌧️ Rain: ${precipitation === 0 ? 'No rain' : precipitation.toFixed(1) + 'mm'} ${rainHealth.emoji}</div>
                    <div class="health-risk" style="color: ${rainHealth.color}">Risk: ${rainHealth.risk}</div>
                    <div class="health-advice">📝 ${rainHealth.advice}</div>
                    ${rainHealth.umbrellaLikely ? '<div class="health-advice">☂️ Umbrella recommended</div>' : ''}
                </div>
                
                <div class="health-card" style="border-left-color: ${windHealth.color}">
                    <div class="health-card-title">💨 Wind: ${windSpeed} km/h ${windHealth.emoji}</div>
                    <div class="health-risk" style="color: ${windHealth.color}">Risk: ${windHealth.risk}</div>
                    <div class="health-advice">📝 ${windHealth.advice}</div>
                </div>
                
                <div class="health-card" style="border-left-color: #3b82f6">
                    <div class="health-card-title">👕 What to Wear Today</div>
                    <div class="health-advice"><strong>Clothing:</strong> ${clothing.clothing.join(', ')}</div>
                    <div class="health-advice"><strong>Accessories:</strong> ${clothing.accessories.length ? clothing.accessories.join(', ') : 'None needed'}</div>
                </div>
                
                <div class="health-card" style="border-left-color: #06b6d4">
                    <div class="health-card-title">💧 Hydration Reminder</div>
                    <div class="health-advice"><strong>Target:</strong> ${hydration.liters} liters (${hydration.glasses} glasses)</div>
                    <div class="health-advice">📝 ${hydration.advice}</div>
                </div>
                
                <div class="health-card" style="border-left-color: #8b5cf6">
                    <div class="health-card-title">📅 Activity Planner</div>
                    <div class="activity-grid">
                        <div class="activity-slot">🌅 Morning: ${activity.morning}</div>
                        <div class="activity-slot">☀️ Afternoon: ${activity.afternoon}</div>
                        <div class="activity-slot">🌙 Evening: ${activity.evening}</div>
                        <div class="activity-slot">🌃 Night: ${activity.night}</div>
                    </div>
                    <div class="health-advice mt-1">⚠️ ${temp > 35 ? 'Avoid outdoor activity 11AM-4PM' : temp < 10 ? 'Dress warmly for morning/evening' : 'Good day for outdoor activities'}</div>
                </div>
            </div>
        </div>
    `;
}

async function fetchUVIndex(lat, lon) {
    try {
        const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${api_key}`;
        const response = await fetch(uvUrl);
        if (!response.ok) throw new Error('UV data not available');
        const data = await response.json();
        return data.value;
    } catch (err) {
        console.error('UV fetch error:', err);
        return null;
    }
}

async function fetchAQI(lat, lon) {
    try {
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${api_key}`;
        const response = await fetch(aqiUrl);
        if (!response.ok) throw new Error('AQI not available');
        const data = await response.json();
        return data.list[0].main.aqi;
    } catch (err) {
        return null;
    }
}

async function renderCurrentWeatherWithHealth(data) {
    const temp = data.main.temp;
    const feelsLike = data.main.feels_like;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const description = data.weather[0].description;
    const country = data.sys.country;
    const cityName = data.name;
    const pressure = data.main.pressure;
    const visibility = (data.visibility / 1000).toFixed(1);
    const lat = data.coord.lat;
    const lon = data.coord.lon;
    
    const uvIndex = await fetchUVIndex(lat, lon);
    currentUVData = uvIndex;
    const aqi = await fetchAQI(lat, lon);
    const healthHTML = renderHealthDashboard(data, uvIndex, lat, lon);
    
    return `
        <div class="current-card">
            <div class="city-header">
                <div class="city-name">${cityName}, ${country}</div>
                <div class="weather-condition-badge">${description.toUpperCase()} ${getWeatherEmoji(description)}</div>
            </div>
            <div class="temp-big">${Math.round(temp)}<span>°C</span></div>
            <p style="margin-bottom: 12px;">🌡️ Feels like ${Math.round(feelsLike)}°C • ${description}</p>
            <div class="weather-details-grid">
                <div class="detail-item"><div class="detail-label">💧 HUMIDITY</div><div class="detail-value">${humidity}%</div></div>
                <div class="detail-item"><div class="detail-label">🌬️ WIND</div><div class="detail-value">${windSpeed} km/h</div></div>
                <div class="detail-item"><div class="detail-label">⏲️ PRESSURE</div><div class="detail-value">${pressure} hPa</div></div>
                <div class="detail-item"><div class="detail-label">👁️ VISIBILITY</div><div class="detail-value">${visibility} km</div></div>
            </div>
            <div style="margin-top: 1rem; text-align:left; font-size:0.75rem; border-top: 1px solid #e2e8f0; padding-top: 12px; display:flex; justify-content:space-between;">
                <span>🌅 Sunrise: ${new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                <span>🌇 Sunset: ${new Date(data.sys.sunset * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                <span>☀️ UV Index: ${uvIndex !== null ? uvIndex : 'N/A'}</span>
                ${aqi ? `<span>🌫️ AQI: ${aqi}</span>` : ''}
            </div>
            
            ${healthHTML}
        </div>
    `;
}

function processHourlyForecast(forecastData) {
    const list = forecastData.list.slice(0, 8);
    return list.map(item => ({
        time: formatTime(item.dt_txt),
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        description: item.weather[0].description,
        pop: Math.round((item.pop || 0) * 100),
        emoji: getWeatherEmoji(item.weather[0].description)
    }));
}

function processDailyForecast(forecastData) {
    const list = forecastData.list;
    const dailyMap = new Map();
    
    list.forEach(item => {
        const dateKey = item.dt_txt.split(' ')[0];
        const dayObj = dailyMap.get(dateKey);
        const temp = item.main.temp;
        const humidity = item.main.humidity;
        const pop = item.pop || 0;
        const description = item.weather[0].description;
        
        if (!dayObj) {
            dailyMap.set(dateKey, {
                date: dateKey,
                temps: [temp],
                maxTemp: temp,
                minTemp: temp,
                humidityValues: [humidity],
                popValues: [pop],
                maxPop: pop,
                descriptions: [description]
            });
        } else {
            dayObj.temps.push(temp);
            dayObj.humidityValues.push(humidity);
            dayObj.popValues.push(pop);
            dayObj.descriptions.push(description);
            if (temp > dayObj.maxTemp) dayObj.maxTemp = temp;
            if (temp < dayObj.minTemp) dayObj.minTemp = temp;
            if (pop > dayObj.maxPop) dayObj.maxPop = pop;
        }
    });
    
    const dailyArray = Array.from(dailyMap.values()).map(day => {
        const avgHumidity = Math.round(day.humidityValues.reduce((a,b) => a+b, 0) / day.humidityValues.length);
        const freqMap = {};
        day.descriptions.forEach(desc => { freqMap[desc] = (freqMap[desc] || 0) + 1; });
        let dominantDesc = Object.keys(freqMap).reduce((a,b) => freqMap[a] > freqMap[b] ? a : b, day.descriptions[0]);
        const popPercent = Math.round((day.maxPop || 0) * 100);
        return {
            date: day.date,
            weekday: getWeekday(day.date),
            maxTemp: Math.round(day.maxTemp),
            minTemp: Math.round(day.minTemp),
            avgHumidity: avgHumidity,
            popChance: popPercent,
            description: dominantDesc,
            emoji: getWeatherEmoji(dominantDesc)
        };
    });
    
    return dailyArray.slice(0, 5);
}

function renderHourlyForecast(hourlyData) {
    if (!hourlyData || hourlyData.length === 0) {
        return `<div class="message-card">⚠️ Hourly forecast not available</div>`;
    }
    
    let html = `<div class="hourly-container">`;
    hourlyData.forEach(hour => {
        html += `
            <div class="hourly-card">
                <div class="hour-time">${hour.time}</div>
                <div class="hour-emoji">${hour.emoji}</div>
                <div class="hour-temp">${hour.temp}°C</div>
                <div class="hour-desc">${hour.description.substring(0, 12)}</div>
                <div class="hour-details">
                    <span>💧 ${hour.humidity}%</span>
                    <span>🌧️ ${hour.pop}%</span>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    return html;
}

function renderDailyForecast(dailyForecast) {
    if (!dailyForecast || dailyForecast.length === 0) {
        return `<div class="message-card">⚠️ No extended forecast available.</div>`;
    }
    
    let html = `<div class="forecast-container">`;
    dailyForecast.forEach(day => {
        const rainAlert = day.popChance > 60 ? '🌧️ High' : (day.popChance > 30 ? '💧 Medium' : '☀️ Low');
        html += `
            <div class="forecast-day">
                <div class="day-info">
                    <div class="day-name">${day.weekday}</div>
                    <div class="weather-icon-small">${day.emoji}</div>
                    <div class="temp-range">
                        <span class="high">${day.maxTemp}°</span> / <span class="low">${day.minTemp}°</span>
                    </div>
                </div>
                <div class="extra-details">
                    <span>💧 ${day.avgHumidity}%</span>
                    <span>☔ ${day.popChance}%</span>
                    <span>${rainAlert}</span>
                    <span>📖 ${day.description}</span>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    return html;
}

function createTabSwitcher() {
    const rightPanel = document.querySelector('.right-panel');
    const existingTabs = document.getElementById('forecast-tabs');
    if (existingTabs) return;
    
    const tabsHTML = `
        <div id="forecast-tabs" class="forecast-tabs">
            <button class="tab-btn active" data-tab="daily">📅 5-Day Forecast</button>
            <button class="tab-btn" data-tab="hourly">🕐 24-Hour Forecast</button>
        </div>
    `;
    
    const titleDiv = rightPanel.querySelector('.forecast-title');
    titleDiv.insertAdjacentHTML('afterend', tabsHTML);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = btn.dataset.tab;
            activeTab = tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (tab === 'daily' && currentDailyData) {
                forecastContainer.innerHTML = renderDailyForecast(currentDailyData);
            } else if (tab === 'hourly' && currentHourlyData) {
                forecastContainer.innerHTML = renderHourlyForecast(currentHourlyData);
            }
        });
    });
}

async function fetchCompleteWeather(city) {
    if (!city.trim()) {
        resultDiv.innerHTML = `<div class="current-card"><p>❌ Please enter a city name</p></div>`;
        return;
    }
    
    resultDiv.innerHTML = `<div class="current-card" style="text-align:center;">🌀 Loading weather for "${city}"...</div>`;
    forecastContainer.innerHTML = `<div class="message-card">⏳ Loading forecast...</div>`;
    
    try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_key}&units=metric`;
        const currentResponse = await fetch(currentUrl);
        if (!currentResponse.ok) throw new Error(`City "${city}" not found`);
        const currentData = await currentResponse.json();
        
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${api_key}&units=metric`;
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error("Forecast not available");
        const forecastData = await forecastResponse.json();
        
        const dailyForecast = processDailyForecast(forecastData);
        const hourlyForecast = processHourlyForecast(forecastData);
        currentDailyData = dailyForecast;
        currentHourlyData = hourlyForecast;
        
        const weatherHTML = await renderCurrentWeatherWithHealth(currentData);
        resultDiv.innerHTML = weatherHTML;
        
        createTabSwitcher();
        if (activeTab === 'daily') {
            forecastContainer.innerHTML = renderDailyForecast(dailyForecast);
        } else {
            forecastContainer.innerHTML = renderHourlyForecast(hourlyForecast);
        }
        
    } catch (err) {
        console.error("Error:", err);
        resultDiv.innerHTML = `<div class="current-card" style="background:#ffebee;"><h3>⚠️ ${err.message}</h3></div>`;
        forecastContainer.innerHTML = `<div class="message-card">📡 Forecast unavailable</div>`;
    }
}

// ==================== FIXED GEOLOCATION FUNCTION ====================
function getUserLocation() {
    // Show loading message
    resultDiv.innerHTML = `<div class="current-card" style="text-align:center;">
        <p>📍 Requesting location permission...</p>
        <p style="font-size: 12px; color: #666;">Please allow location access when prompted</p>
    </div>`;
    
    if ("geolocation" in navigator) {
        // Request location with proper options
        const options = {
            enableHighAccuracy: true,  // Get precise location
            timeout: 10000,            // 10 second timeout
            maximumAge: 0              // Don't use cached location
        };
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${api_key}&units=metric`);
                    if (!res.ok) throw new Error("Weather data not available");
                    const data = await res.json();
                    cityInput.value = data.name;
                    fetchCompleteWeather(data.name);
                } catch (err) {
                    console.error("Location weather error:", err);
                    initialDemoLoad();
                }
            },
            (error) => {
                // Handle different error cases
                console.error("Geolocation error:", error);
                let errorMessage = "";
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "❌ Location permission denied. Please allow location access or search for a city manually.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "📍 Location information unavailable. Please search for a city manually.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "⏰ Location request timed out. Please try again or search manually.";
                        break;
                    default:
                        errorMessage = "⚠️ Could not get your location. Please search for a city manually.";
                }
                resultDiv.innerHTML = `<div class="current-card" style="background:#ffebee;">
                    <p>${errorMessage}</p>
                    <p style="margin-top: 10px;">🔍 Try searching: <strong>London, New York, Tokyo, Mumbai</strong></p>
                </div>`;
                initialDemoLoad();
            },
            options
        );
    } else {
        resultDiv.innerHTML = `<div class="current-card" style="background:#ffebee;">
            <p>🌐 Geolocation is not supported by your browser.</p>
            <p>Please search for a city manually.</p>
        </div>`;
        initialDemoLoad();
    }
}

function addVoiceButton() {
    const weatherBox = document.querySelector('.weather-box');
    if (weatherBox && !document.getElementById('voice-btn')) {
        const voiceBtn = document.createElement('button');
        voiceBtn.id = 'voice-btn';
        voiceBtn.type = 'button';
        voiceBtn.innerHTML = '🎤';
        voiceBtn.title = 'Voice Search';
        voiceBtn.style.width = '50px';
        voiceBtn.style.marginLeft = '10px';
        voiceBtn.style.cursor = 'pointer';
        voiceBtn.onclick = startVoiceSearch;
        weatherBox.appendChild(voiceBtn);
    }
}

function addLocationButton() {
    const weatherBox = document.querySelector('.weather-box');
    if (weatherBox && !document.getElementById('location-btn')) {
        const locationBtn = document.createElement('button');
        locationBtn.id = 'location-btn';
        locationBtn.type = 'button';
        locationBtn.innerHTML = '📍';
        locationBtn.title = 'Use My Location';
        locationBtn.style.width = '50px';
        locationBtn.style.marginLeft = '5px';
        locationBtn.style.cursor = 'pointer';
        locationBtn.style.background = '#4CAF50';
        locationBtn.style.border = 'none';
        locationBtn.style.borderRadius = '8px';
        locationBtn.style.fontSize = '20px';
        locationBtn.onclick = () => getUserLocation();
        weatherBox.appendChild(locationBtn);
    }
}

function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('❌ Voice search not supported in this browser');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    
    const originalPlaceholder = cityInput.placeholder;
    cityInput.placeholder = '🎤 Listening...';
    
    recognition.start();
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        cityInput.value = transcript;
        cityInput.placeholder = originalPlaceholder;
        fetchCompleteWeather(transcript);
    };
    
    recognition.onerror = () => {
        cityInput.placeholder = originalPlaceholder;
        alert('Voice recognition failed. Please type city name.');
    };
}

function initializeEvents() {
    btn.addEventListener('click', () => {
        let cityVal = cityInput.value.trim();
        if (cityVal === "") return;
        fetchCompleteWeather(cityVal);
    });
    
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            let cityVal = cityInput.value.trim();
            if (cityVal === "") return;
            fetchCompleteWeather(cityVal);
        }
    });
}

function initialDemoLoad() {
    // Don't auto-fetch empty city - show a default or message
    fetchCompleteWeather("New York");
}

// ==================== START APPLICATION ====================
// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEvents();
    addVoiceButton();
    addLocationButton();
    
    // Ask for location immediately when page loads
    // This triggers the browser permission popup
    setTimeout(() => {
        getUserLocation();
    }, 100);
});