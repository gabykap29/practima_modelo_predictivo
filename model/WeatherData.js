import mongoose from "mongoose";

// Definimos el esquema para la colección `WeatherData`
const weatherDataSchema = new mongoose.Schema({
  // Identificador único de la estación
  station_id: {
    type: String,
    required: true, // Es obligatorio tener un id para la estación
  },

  // Fecha en formato YYYY-MM-DD
  date: {
    type: String,
    required: true, // Es obligatorio tener una fecha para cada documento
  },

  // Datos meteorológicos
  data: {
    timestamp: Date, // Marca de tiempo de los datos (última actualización)
    temperature: Number, // Temperatura en grados Celsius
    feelslike: Number, // Sensación térmica en grados Celsius
    humidity: Number, // Humedad relativa en porcentaje
    dewPoint: Number, // Punto de rocío en grados Celsius
    precipitation: Number, // Precipitación actual (en mm)
    rain1h: Number, // Lluvia caída en la última hora (en mm)
    rain24h: Number, // Lluvia caída en las últimas 24 horas (en mm)
    rainCurrentDay: Number, // Lluvia caída el día de hoy (en mm)
    windSpeed: Number, // Velocidad del viento (en m/s)
    windDirection: Number, // Dirección del viento (en grados)
    pressure: Number, // Presión atmosférica (en hPa)
    visibility: Number, // Visibilidad (en km)
    cloudCover: Number, // Cobertura nubosa (en porcentaje)
    solarRadiation: Number, // Radiación solar (en W/m²)
    uvIndex: Number, // Índice UV
    conditions: String, // Condiciones climáticas (descripción)
    icon: String, // Ícono representativo de las condiciones climáticas
    battery: Number, // Nivel de batería de la estación
    solarPanel: Number, // Producción de energía del panel solar (si disponible)
    location: {
      latitude: Number, // Latitud de la estación
      longitude: Number, // Longitud de la estación
    },
    warnings: Array, // Advertencias asociadas a la estación (si hay)
    sensors: Array, // Sensores utilizados en la estación (si los hay)
    sms_numbers: Array, // Números de teléfono para notificaciones por SMS (si los hay)
    licenses: Boolean, // Licencias asociadas a la estación (si las hay)
  },
});

// Creamos el modelo basado en el esquema de Mongoose
const WeatherData = mongoose.model('WeatherData', weatherDataSchema);

export default WeatherData; // Exportamos el modelo para usarlo en otras partes de la app
