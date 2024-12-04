import { v4 as uuidv4 } from 'uuid';
import WeatherData from "../model/WeatherData.js";


export async function prompt(req, res) {
    const {consulta, provincia } = req.body;
  try {
     const obtenerDatos = await obtener(provincia);
      const peticion = await fetch('http://127.0.0.1:11434/api/generate', {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({
              model: "cm-model-prediction",
              prompt: "Estos son los datos del clima de hoy: " + obtenerDatos + "esta es la consulta del usuario: " + consulta,
              num_keep: 1,
          }),
      });

      // Establecer encabezados para indicar que se enviará una respuesta progresiva
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");

      let accumulatedJSON = "";
      let activity = "";
      const reader = peticion.body.getReader();
      let decoder = new TextDecoder();
      let chunk = await reader.read();

      while (!chunk.done) {
          const texto = decoder.decode(chunk.value, { stream: true });
          accumulatedJSON += texto;

          let startIndex = 0;
          while (startIndex < accumulatedJSON.length) {
              const startBracketIndex = accumulatedJSON.indexOf("{", startIndex);
              if (startBracketIndex === -1) break;
              const endBracketIndex = accumulatedJSON.indexOf(
                  "}",
                  startBracketIndex,
              );
              if (endBracketIndex === -1) break;

              const jsonString = accumulatedJSON.slice(
                  startBracketIndex,
                  endBracketIndex + 1,
              );
              try {
                  const responseObject = JSON.parse(jsonString);
                  const responseValue = responseObject.response;
                  activity += responseValue;

                  res.write(responseValue);
              } catch (error) {
                  // Ignorar errores de análisis JSON parcial
              }
              startIndex = endBracketIndex + 1;
          }

          accumulatedJSON = accumulatedJSON.slice(startIndex);
          chunk = await reader.read();
      }

      res.end();
  
  } catch (error) {
      return res.status(500).json({
          status: 500,
          message: "Error interno del servidor!"
      });
  }
}
// Función para obtener y guardar los datos de clima en la base de datos

export async function obtenerYGuardarDatosClima(req, res) {
  const today = new Date().toISOString().split('T')[0];

  // Verificamos si ya existen los datos de hoy
  const existingData = await WeatherData.find({ date: today });

  if (existingData.length > 0) {
    console.log('Los datos de clima de hoy ya están en la base de datos');
    return res.json(existingData);
  }

  try {
    // Llamadas paralelas a ambas APIs
    const [api1Response, api2Response] = await Promise.all([
      fetch('https://ramf.formosa.gob.ar/api/station'),
      fetch('https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/formosa%20argentina?unitGroup=metric&key=UMQ9KWF37S9T6WL8J4WLN5Q23&contentType=json')
    ]);

    const [api1Data, api2Data] = await Promise.all([
      api1Response.json(),
      api2Response.json()
    ]);

    // Procesamos los datos de la API 1
    const datosApi1 = api1Data.map((dato) => ({
      station_id: uuidv4(),
      date: today,
      data: {
        timestamp: dato.dates?.max_date || null,
        temperature: dato.meta?.airTemp || null,
        humidity: dato.meta?.rh || null,
        rain1h: dato.meta?.rain1h || null,
        rain24h: typeof dato.meta?.rain24h === 'object' ? dato.meta.rain24h.sum : dato.meta?.rain24h || null,
        windSpeed: dato.meta?.windSpeed || null,
        location: {
          latitude: dato.position?.geo?.coordinates[1] || null,
          longitude: dato.position?.geo?.coordinates[0] || null,
        },
        warnings: dato.warnings || [],
      },
    }));

    // Procesamos los datos de la API 2 (Visual Crossing)
    const currentConditions = api2Data.currentConditions;
    const datosApi2 = {
      station_id: uuidv4(),
      date: today,
      data: {
        timestamp: currentConditions.datetime || null,
        temperature: currentConditions.temp || null,
        feelslike: currentConditions.feelslike || null,
        humidity: currentConditions.humidity || null,
        dewPoint: currentConditions.dew || null,
        precipitation: currentConditions.precip || null,
        windSpeed: currentConditions.windspeed || null,
        windDirection: currentConditions.winddir || null,
        pressure: currentConditions.pressure || null,
        visibility: currentConditions.visibility || null,
        cloudCover: currentConditions.cloudcover || null,
        solarRadiation: currentConditions.solarradiation || null,
        uvIndex: currentConditions.uvindex || null,
        sunrise: api2Data.days[0]?.sunrise || null,
        sunset: api2Data.days[0]?.sunset || null,
        conditions: currentConditions.conditions || null,
        icon: currentConditions.icon || null,
      },
    };

    // Combinamos los datos de ambas APIs
    const combinedData = datosApi1.map((dato) => ({
      ...dato,
      data: {
        ...dato.data,
        additionalDataFromVisualCrossing: datosApi2.data, // Enlaza datos adicionales de Visual Crossing
      },
    }));

    // Guardamos los datos en la base de datos
    const savedData = await WeatherData.insertMany(combinedData);
    console.log('Datos de clima guardados en la base de datos');
    return res.json(savedData);

  } catch (error) {
    console.error('Error al obtener o guardar los datos de clima:', error);
    return res.status(500).send('Hubo un error al obtener o guardar los datos de clima');
  }
}

  
export async function obtener(provincia= 'formosa%20argentina') {
  const today = new Date().toISOString().split('T')[0];

  // Verificamos si ya existen los datos de hoy
  const existingData = await WeatherData.find({ date: today });

  if (existingData.length > 0) {
    console.log('Los datos de clima de hoy ya están en la base de datos');

    // Retornamos los datos en formato texto resumido
    const summary = existingData.map((dato) => ({
      date: dato.date,
      temperature: dato.data.temperature,
      humidity: dato.data.humidity,
      rain1h: dato.data.rain1h,
      rain24h: dato.data.rain24h,
      windSpeed: dato.data.windSpeed,
    }));
    return JSON.stringify(summary);
  } else {
    console.log('No se encontraron datos de clima de hoy. Realizando el fetch...');

    try {
      // Llamadas paralelas a ambas APIs
      const [api1Response, api2Response] = await Promise.all([
        fetch('https://ramf.formosa.gob.ar/api/station'),
        fetch('https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/' + provincia+'?unitGroup=metric&key=UMQ9KWF37S9T6WL8J4WLN5Q23&contentType=json'),
      ]);

      const [api1Data, api2Data] = await Promise.all([
        api1Response.json(),
        api2Response.json(),
      ]);

      // Procesamos datos de la API 1
      const datosApi1 = api1Data.map((dato) => ({
        station_id: uuidv4(),
        date: today,
        data: {
          timestamp: dato.dates?.max_date || null,
          temperature: dato.meta?.airTemp || null,
          humidity: dato.meta?.rh || null,
          rain1h: dato.meta?.rain1h || null,
          rain24h: typeof dato.meta?.rain24h === 'object' ? dato.meta.rain24h.sum : dato.meta?.rain24h || null,
          windSpeed: dato.meta?.windSpeed || null,
          location: {
            latitude: dato.position?.geo?.coordinates[1] || null,
            longitude: dato.position?.geo?.coordinates[0] || null,
          },
        },
      }));

      // Procesamos datos de la API 2 (Visual Crossing)
      const currentConditions = api2Data.currentConditions;
      const datosApi2 = {
        station_id: uuidv4(),
        date: today,
        data: {
          timestamp: currentConditions.datetime || null,
          temperature: currentConditions.temp || null,
          feelslike: currentConditions.feelslike || null,
          humidity: currentConditions.humidity || null,
          dewPoint: currentConditions.dew || null,
          precipitation: currentConditions.precip || null,
          windSpeed: currentConditions.windspeed || null,
          windDirection: currentConditions.winddir || null,
          pressure: currentConditions.pressure || null,
          visibility: currentConditions.visibility || null,
          cloudCover: currentConditions.cloudcover || null,
          solarRadiation: currentConditions.solarradiation || null,
          uvIndex: currentConditions.uvindex || null,
          conditions: currentConditions.conditions || null,
          icon: currentConditions.icon || null,
        },
      };

      // Combinamos los datos
      const combinedData = datosApi1.concat([datosApi2]);

      // Guardamos los datos combinados en la base de datos
      const savedData = await WeatherData.insertMany(combinedData);
      console.log('Datos de clima guardados en la base de datos');

      // Creamos el resumen de los datos
      const summary = savedData.map((dato) => ({
        date: dato.date,
        temperature: dato.data.temperature,
        humidity: dato.data.humidity,
        rain1h: dato.data.rain1h,
        rain24h: dato.data.rain24h,
        windSpeed: dato.data.windSpeed,
        additionalInfo: {
          feelslike: dato.data.feelslike || null,
          uvIndex: dato.data.uvIndex || null,
          conditions: dato.data.conditions || null,
        },
      }));
      return JSON.stringify(summary);
    } catch (error) {
      console.error('Error al obtener o guardar los datos de clima:', error);
      throw new Error('Hubo un error al obtener o guardar los datos de clima');
    }
  }
}


