// let cityInput = document.getElementById('city_input');
// let btn = document.getElementById('submit_btn');

// let result = document.getElementById('weather-result');


// let api_key = "6a4e87aed29f15892fbb781fd257715f";
// btn.addEventListener("click" , function(){
    
//     let city = cityInput.value;
//     if(city === ""){
//     result.innerHTML = `<p>please enter city name </p>`;
//     return;
// }

// let url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_key}&units=metric`;;

// fetch(url)
//         .then(function(response){
//             if(!response.ok){
//                 throw new Error("city not found");
//             }
//             return response.json();
//         })
//         .then(function(data){
//             result.innerHTML = `
//                 <h2>${data.name}, ${data.sys.country}</h2>
//                 <p>🌡️ Temperature: ${data.main.temp}°C</p>
//                 <p>☁️ Weather: ${data.weather[0].description}</p>
//                 <p>💧 Humidity: ${data.main.humidity}%</p>
//                 <p>💨 Wind: ${data.wind.speed} m/s</p>
//             `;
//         })
//         .catch(function(err){
//             result.innerHTML = `<p>Error: ${err.message}`;
//         });
// });


let cityInput = document.getElementById('city_input');
let btn = document.getElementById('submit_btn');
let result = document.getElementById('weather-result');

let api_key = "6a4e87aed29f15892fbb781fd257715f";

// cityInput.addEventListener('keypress' , function(e){
//   if(e.key === 'Enter'){
//       SubmitFunction();
//   }
// });

// btn.addEventListener('click' , function(){
//   SubmitFunction();
// })

// async function SubmitFunction() {
  
// let city = cityInput.value;
// if(city === ""){
//   result.innerHTML = `<p>city name is mandatory</p>`;
//   return;
// }

// try{
//   let res  = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_key}&units=metric`);

//   if(!res.ok) throw new Error("fetch problem city missing");

//   let data = await res.json();

//   result.innerHTML = `
  
//   <h2>${data.name}</h2>
//   <p>Temprature : ${data.main.temp}C</p>
  
//   `;

//  }
// catch(err){
//     result.innerHTML = `<p>Error : ${err.message}</p>`;
// } 

// }


// cityInput.addEventListener('keypress' , function(e){
//   if(e.key === 'Enter'){
//     submitFunction();
//   }
// });

btn.addEventListener('click' , function(){
  weather();
});


let weather = async () => {
  let city = cityInput.value;
  if(city === ""){
    result.innerHTML = "city name is mandatory";
    return;
  }

  try{
    let res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_key}&units=metric`);
    if(!res.ok) throw new Error("something went wrong in api");

    let data = await res.json();
    result.innerHTML = `
    <h2>${data.name} , ${data.sys.country}</h2>
    <p>Temp : ${data.main.temp}</p>
    
    `;

  }catch(err){
    result.innerHTML = 'error' , err.message;
  }
}