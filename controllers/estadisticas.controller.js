import WeatherData from '../model/WeatherData.js';

export async function obtenerPromediosClimaticos(req, res) {
  try {
    // Rango de fechas opcional pasado como query (si no se pasa, usa hoy como predeterminado)
    const { startDate, endDate } = req.query;
    const today = new Date().toISOString().split('T')[0];

    // Si no se proporcionan fechas, usamos hoy como rango
    const start = startDate || today;
    const end = endDate || today;

    // Filtrar los datos dentro del rango de fechas
    const datos = await WeatherData.find({
      date: { $gte: start, $lte: end }
    });

    if (datos.length === 0) {
      return res.status(404).json({ message: 'No se encontraron datos en el rango especificado' });
    }

    // Variables para almacenar los totales
    let totalTemperature = 0;
    let totalHumidity = 0;
    let totalRain = 0;
    let totalWindSpeed = 0;
    let totalEntries = datos.length;

    // Recorrer los datos y sumar los valores
    datos.forEach((dato) => {
      totalTemperature += dato.data.temperature || 0;
      totalHumidity += dato.data.humidity || 0;
      totalRain += dato.data.rain24h || 0;
      totalWindSpeed += dato.data.windSpeed || 0;
    });

    // Calcular promedios
    const averageTemperature = totalTemperature / totalEntries;
    const averageHumidity = totalHumidity / totalEntries;
    const averageRain = totalRain / totalEntries;
    const averageWindSpeed = totalWindSpeed / totalEntries;

    // Preparar la respuesta
    const promedios = {
      rango: { inicio: start, fin: end },
      promedios: {
        temperatura: averageTemperature.toFixed(2), // Redondeamos a 2 decimales
        humedad: averageHumidity.toFixed(2),
        lluvia: averageRain.toFixed(2),
        velocidadViento: averageWindSpeed.toFixed(2),
      },
      totalRegistros: totalEntries,
    };

    return res.json(promedios);
  } catch (error) {
    console.error('Error al calcular los promedios climáticos:', error);
    return res.status(500).json({ message: 'Error al calcular los promedios climáticos' });
  }
}
