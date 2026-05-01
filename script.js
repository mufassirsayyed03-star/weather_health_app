let cityInput = document.getElementById('city_input');
let btn = document.getElementById('submit_btn');
let resultDiv = document.getElementById('weather-result');
let forecastContainer = document.getElementById('forecast-container');

const api_key = "6a4e87aed29f15892fbb781fd257715f";

// Global variables to store data for tab switching
let currentHourlyData = null;
let currentDailyData = null;
let activeTab = 'daily'; // 'daily' or 'hourly'

// Helper: format weekday
function getWeekday(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// Helper: format time from 3-hour interval
function formatTime(dt_txt) {
    const date = new Date(dt_txt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper: map weather condition to emoji
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

// Get AQI description and color
function getAQIInfo(aqi) {
    const aqiMap = {
        1: { label: 'Good', color: '#22c55e', emoji: '🟢', description: 'Air quality is satisfactory' },
        2: { label: 'Fair', color: '#a3e635', emoji: '🟡', description: 'Air quality is acceptable' },
        3: { label: 'Moderate', color: '#facc15', emoji: '🟠', description: 'Sensitive groups should reduce outdoor activity' },
        4: { label: 'Poor', color: '#f97316', emoji: '🔴', description: 'Health effects possible for everyone' },
        5: { label: 'Very Poor', color: '#ef4444', emoji: '⚫', description: 'Serious health risk - avoid outdoor activity' }
    };
    return aqiMap[aqi] || { label: 'Unknown', color: '#94a3b8', emoji: '❓', description: 'No data available' };
}

// 🎤 Voice Search Function
function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('❌ Voice search is not supported in your browser. Try Chrome, Edge, or Safari.');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Show listening status
    const originalPlaceholder = cityInput.placeholder;
    cityInput.placeholder = '🎤 Listening... Speak now!';
    cityInput.style.borderColor = '#4facfe';
    
    recognition.start();
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        cityInput.value = transcript;
        cityInput.placeholder = originalPlaceholder;
        cityInput.style.borderColor = '';
        // Auto search after voice input
        fetchCompleteWeather(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        cityInput.placeholder = originalPlaceholder;
        cityInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            cityInput.style.borderColor = '';
        }, 2000);
        
        let errorMsg = '';
        switch(event.error) {
            case 'not-allowed':
                errorMsg = 'Microphone access denied. Please allow mic access.';
                break;
            case 'no-speech':
                errorMsg = 'No speech detected. Please try again.';
                break;
            default:
                errorMsg = 'Voice search failed. Please type city name.';
        }
        
        resultDiv.innerHTML = `<div class="current-card" style="background:#ffebee;">
            <p>⚠️ ${errorMsg}</p>
        </div>`;
    };
    
    recognition.onend = () => {
        setTimeout(() => {
            if (cityInput.placeholder === '🎤 Listening... Speak now!') {
                cityInput.placeholder = originalPlaceholder;
                cityInput.style.borderColor = '';
            }
        }, 500);
    };
}

// 🌫️ Fetch Air Quality Index (AQI)
async function fetchAQI(lat, lon) {
    try {
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${api_key}`;
        const response = await fetch(aqiUrl);
        if (!response.ok) throw new Error('AQI not available');
        const data = await response.json();
        const aqi = data.list[0].main.aqi;
        const components = data.list[0].components;
        return { aqi, components };
    } catch (err) {
        console.error('AQI fetch error:', err);
        return null;
    }
}

// Render AQI Card
function renderAQICard(aqiData, cityName) {
    if (!aqiData) {
        return `<div class="aqi-card" style="background:#f1f5f9;">
            <div class="aqi-title">🌫️ Air Quality</div>
            <p>AQI data not available for this location</p>
        </div>`;
    }
    
    const aqiInfo = getAQIInfo(aqiData.aqi);
    const components = aqiData.components;
    
    return `
        <div class="aqi-card" style="border-left: 4px solid ${aqiInfo.color};">
            <div class="aqi-title">
                <span>🌫️ Air Quality Index (AQI)</span>
                <span class="aqi-badge" style="background: ${aqiInfo.color}20; color: ${aqiInfo.color};">
                    ${aqiInfo.emoji} ${aqiInfo.label}
                </span>
            </div>
            <div class="aqi-value" style="color: ${aqiInfo.color};">${aqiInfo.label}</div>
            <p class="aqi-desc">${aqiInfo.description}</p>
            <div class="pollutants-grid">
                <div class="pollutant"><span>PM2.5</span><strong>${components.pm2_5} µg/m³</strong></div>
                <div class="pollutant"><span>PM10</span><strong>${components.pm10} µg/m³</strong></div>
                <div class="pollutant"><span>NO₂</span><strong>${components.no2} µg/m³</strong></div>
                <div class="pollutant"><span>O₃</span><strong>${components.o3} µg/m³</strong></div>
                <div class="pollutant"><span>CO</span><strong>${components.co} µg/m³</strong></div>
                <div class="pollutant"><span>SO₂</span><strong>${components.so2} µg/m³</strong></div>
            </div>
        </div>
    `;
}

// Render current weather with AQI
async function renderCurrentWeatherWithAQI(data) {
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
    
    // Fetch AQI
    const aqiData = await fetchAQI(lat, lon);
    const aqiHTML = renderAQICard(aqiData, cityName);
    
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
                <div class="detail-item"><div class="detail-label">🌬️ WIND</div><div class="detail-value">${windSpeed} m/s</div></div>
                <div class="detail-item"><div class="detail-label">⏲️ PRESSURE</div><div class="detail-value">${pressure} hPa</div></div>
                <div class="detail-item"><div class="detail-label">👁️ VISIBILITY</div><div class="detail-value">${visibility} km</div></div>
            </div>
            <div style="margin-top: 1rem; text-align:left; font-size:0.75rem; border-top: 1px solid #e2e8f0; padding-top: 12px; display:flex; justify-content:space-between;">
                <span>🌅 Sunrise: ${new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                <span>🌇 Sunset: ${new Date(data.sys.sunset * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            ${aqiHTML}
        </div>
    `;
}

// 🕐 Process Hourly Forecast (next 24 hours - 3-hour intervals)
function processHourlyForecast(forecastData) {
    const list = forecastData.list.slice(0, 8); // Next 24 hours (8 intervals of 3 hours)
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

// Render Hourly Forecast
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

// Process Daily Forecast (5-day)
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

// Render Daily Forecast
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

// Create Tab Switcher UI
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
    
    // Add event listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = btn.dataset.tab;
            activeTab = tab;
            
            // Update active class
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Render appropriate forecast
            if (tab === 'daily' && currentDailyData) {
                forecastContainer.innerHTML = renderDailyForecast(currentDailyData);
            } else if (tab === 'hourly' && currentHourlyData) {
                forecastContainer.innerHTML = renderHourlyForecast(currentHourlyData);
            }
        });
    });
}

// Fetch Weather by Coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${api_key}&units=metric`;
        const currentResponse = await fetch(currentUrl);
        if (!currentResponse.ok) throw new Error("Unable to fetch weather");
        const currentData = await currentResponse.json();
        cityInput.value = currentData.name;
        
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${api_key}&units=metric`;
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error("Forecast not available");
        const forecastData = await forecastResponse.json();
        
        // Process data
        const dailyForecast = processDailyForecast(forecastData);
        const hourlyForecast = processHourlyForecast(forecastData);
        currentDailyData = dailyForecast;
        currentHourlyData = hourlyForecast;
        
        // Render current weather with AQI
        const weatherHTML = await renderCurrentWeatherWithAQI(currentData);
        resultDiv.innerHTML = weatherHTML;
        
        // Create tabs and render default
        createTabSwitcher();
        if (activeTab === 'daily') {
            forecastContainer.innerHTML = renderDailyForecast(dailyForecast);
        } else {
            forecastContainer.innerHTML = renderHourlyForecast(hourlyForecast);
        }
        
    } catch (err) {
        console.error("Error:", err);
        resultDiv.innerHTML = `<div class="current-card" style="background:#ffebee;"><h3>⚠️ ${err.message}</h3></div>`;
        initialDemoLoad();
    }
}

// Fetch Complete Weather by City Name
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
        
        const weatherHTML = await renderCurrentWeatherWithAQI(currentData);
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

// 🌐 Geolocation
function getUserLocation() {
    resultDiv.innerHTML = `<div class="current-card" style="text-align:center;"><p>📍 Requesting location...</p></div>`;
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.warn("Geolocation error:", error);
                initialDemoLoad();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        initialDemoLoad();
    }
}

// Add Voice Search Button to UI
function addVoiceButton() {
    const weatherBox = document.querySelector('.weather-box');
    if (weatherBox && !document.getElementById('voice-btn')) {
        const voiceBtn = document.createElement('button');
        voiceBtn.id = 'voice-btn';
        voiceBtn.type = 'button';
        voiceBtn.innerHTML = '🎤';
        voiceBtn.title = 'Voice Search';
        voiceBtn.style.width = '50px';
        voiceBtn.onclick = startVoiceSearch;
        weatherBox.appendChild(voiceBtn);
    }
}

// Event Listeners
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
    cityInput.value = "";
    fetchCompleteWeather("");
}

// Start App
initializeEvents();
addVoiceButton();
getUserLocation();