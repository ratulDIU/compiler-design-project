export async function analyzeFraud(data){

const response = await fetch("http://localhost:8001/analyze",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body: JSON.stringify(data)

})

return await response.json()

}