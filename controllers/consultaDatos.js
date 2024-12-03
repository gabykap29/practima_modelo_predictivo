import { v4 as uuidv4 } from 'uuid';
import WeatherData from "../model/WeatherData.js";


export async function prompt(req, res) {
    const {consulta } = req.body;
  try {
     const obtenerDatos = await obtener();
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
    // Obtenemos la fecha actual en formato "YYYY-MM-DD"
    const today = new Date().toISOString().split('T')[0];
  
    // Verificamos si ya existen los datos de hoy para la estación 1
    const existingData = await WeatherData.find({ date: today });
  
    // Verificamos si no existen datos de clima para hoy
    if (existingData.length > 0) {
      // Si los datos de hoy ya existen, retornamos esos datos
      console.log('Los datos de clima de hoy ya están en la base de datos');
      return res.json(existingData);
    } else {
      // Si no existen, hacemos el fetch a la API para obtener los datos más recientes
      console.log('No se encontraron datos de clima de hoy. Realizando el fetch...');
      
      try {
        // Hacemos la solicitud a la API de datos meteorológicos
        const response = await fetch('https://ramf.formosa.gob.ar/api/station');
        const data = await response.json();  // Convertimos la respuesta en formato JSON
        
        // Filtramos y mapeamos los datos relevantes para almacenarlos
        const filteredData = data.map((dato) => ({
          station_id: uuidv4(),
          date: today,  // Usamos la fecha de hoy para este documento
          data: {
            timestamp: dato.dates?.max_date || null,
            temperature: dato.meta?.airTemp || null,
            humidity: dato.meta?.rh || null,
            rain1h: dato.meta?.rain1h || null,
            rain24h: (dato.meta?.rain24h && typeof dato.meta.rain24h === 'object') ? dato.meta.rain24h.sum : dato.meta?.rain24h || null, // Extraemos solo el 'sum'
            rainCurrentDay: (dato.meta?.rainCurrentDay && typeof dato.meta.rainCurrentDay === 'object') ? dato.meta.rainCurrentDay.sum : dato.meta?.rainCurrentDay || null, // Extraemos solo el 'sum'
            windSpeed: dato.meta?.windSpeed || null,
            battery: dato.meta?.battery || null,
            solarPanel: dato.meta?.solarPanel || null,
            location: {
              latitude: dato.position?.geo?.coordinates[1] || null,
              longitude: dato.position?.geo?.coordinates[0] || null,
            },
            warnings: dato.warnings || [],  // Si hay advertencias, las agregamos
            sensors: dato.sensors || [],  // Si hay sensores, los agregamos
            sms_numbers: dato.sms_numbers || [],  // Si hay números de teléfono, los agregamos
            licenses: dato.licenses || false,  // Usamos false si no hay información de licencias
          },
        }));
  
        // Guardamos los datos filtrados en la base de datos
        const savedData = await WeatherData.insertMany(filteredData);
        console.log('Datos de clima guardados en la base de datos');
        return res.json(savedData);  // Retornamos los datos que hemos guardado
      } catch (error) {
        console.error('Error al obtener o guardar los datos de clima:', error);
        return res.status(500).send('Hubo un error al obtener o guardar los datos de clima');
      }
    }
  }
  
  export async function obtener() {
    // Obtenemos la fecha actual en formato "YYYY-MM-DD"
    const today = new Date().toISOString().split('T')[0];
  
    // Verificamos si ya existen los datos de hoy para la estación 1
    const existingData = await WeatherData.find({ date: today });
  
    // Verificamos si no existen datos de clima para hoy
    if (existingData.length > 0) {
      // Si los datos de hoy ya existen, los retornamos en formato simplificado
      console.log('Los datos de clima de hoy ya están en la base de datos');
      
      // Retornamos los datos resumidos en formato texto
      const summary = existingData.map(dato => ({
        date: dato.date,
        temperature: dato.data.temperature,
        humidity: dato.data.humidity,
        rain1h: dato.data.rain1h,
        rain24h: dato.data.rain24h,
        windSpeed: dato.data.windSpeed
      }));
      return JSON.stringify(summary);
    } else {
      // Si no existen, hacemos el fetch a la API para obtener los datos más recientes
      console.log('No se encontraron datos de clima de hoy. Realizando el fetch...');
      
      try {
        // Hacemos la solicitud a la API de datos meteorológicos
        const response = await fetch('https://ramf.formosa.gob.ar/api/station');
        const data = await response.json();  // Convertimos la respuesta en formato JSON
        
        // Filtramos y mapeamos los datos relevantes para almacenarlos
        const filteredData = data.map((dato) => ({
          station_id: uuidv4(),
          date: today,  // Usamos la fecha de hoy para este documento
          data: {
            timestamp: dato.dates?.max_date || null,
            temperature: dato.meta?.airTemp || null,
            humidity: dato.meta?.rh || null,
            rain1h: dato.meta?.rain1h || null,
            rain24h: (dato.meta?.rain24h && typeof dato.meta.rain24h === 'object') ? dato.meta.rain24h.sum : dato.meta?.rain24h || null, // Extraemos solo el 'sum'
            rainCurrentDay: (dato.meta?.rainCurrentDay && typeof dato.meta.rainCurrentDay === 'object') ? dato.meta.rainCurrentDay.sum : dato.meta?.rainCurrentDay || null, // Extraemos solo el 'sum'
            windSpeed: dato.meta?.windSpeed || null,
            battery: dato.meta?.battery || null,
            solarPanel: dato.meta?.solarPanel || null,
            location: {
              latitude: dato.position?.geo?.coordinates[1] || null,
              longitude: dato.position?.geo?.coordinates[0] || null,
            },
            warnings: dato.warnings || [],  // Si hay advertencias, las agregamos
            sensors: dato.sensors || [],  // Si hay sensores, los agregamos
            sms_numbers: dato.sms_numbers || [],  // Si hay números de teléfono, los agregamos
            licenses: dato.licenses || false,  // Usamos false si no hay información de licencias
          },
        }));
  
        // Guardamos los datos filtrados en la base de datos
        const savedData = await WeatherData.insertMany(filteredData);
        console.log('Datos de clima guardados en la base de datos');
        
        // Retornamos los datos en formato resumido
        const summary = savedData.map(dato => ({
          date: dato.date,
          temperature: dato.data.temperature,
          humidity: dato.data.humidity,
          rain1h: dato.data.rain1h,
          rain24h: dato.data.rain24h,
          windSpeed: dato.data.windSpeed
        }));
        return JSON.stringify(summary);  // Retornamos los datos de manera resumida
      } catch (error) {
        console.error('Error al obtener o guardar los datos de clima:', error);
        return res.status(500).send('Hubo un error al obtener o guardar los datos de clima');
      }
    }
}


