import mongoose from 'mongoose';

async function connectToDatabase() {
    mongoose.connect('mongodb://localhost:27017/db', {
    }).then(() => console.log('Conectado a MongoDB'))
      .catch((error) => console.error('Error al conectar con MongoDB:', error));
}


export default connectToDatabase;