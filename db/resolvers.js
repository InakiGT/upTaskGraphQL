const Usuario = require('../models/Usuario');
const Proyecto = require('../models/Proyecto');
const Tarea = require('../models/Tarea');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

//Crea y firma un Json Web Token
const crearToken = (usuario, secreta, expiresIn) => {
  const {id, email, nombre} = usuario;

  return jwt.sign({id, email, nombre}, secreta, {expiresIn}); //3 paeametros, 1 el payload, 2 la firma del token y 3 los parametros como objeto
}

const resolvers = {
    Query: {
        obtenerProyectos: async (_, {}, ctx) => {
          const proyectos = await Proyecto.find({creador: ctx.usuario.id});

          return proyectos;
        },
        obtenerTareas: async (_, {input}, ctx) => {
          const tareas = await Tarea.find({creador: ctx.usuario.id}).where('proyecto').equals(input.proyecto);

          return tareas;
        }
    },
    Mutation: {
      crearUsuario: async (_, {input}) => {
        const {email, password} = input;

        const existeUsuario = await Usuario.findOne({email}); //Busca en la base de datos si ya existe este email registrado

        //Si el usuario existe
        if(existeUsuario) {
          throw new Error('El usuario ya está registrado'); //Si ya existe un usuario se manda un mensaje de error
        }

        try {

          //Hashear password
          const salt = await bcryptjs.genSalt(10); //Genera una cadena díficil de descifrar, parecido a los parametros de hash de php
          //Modificamos el password del input ya creado
          input.password = await bcryptjs.hash(password, salt); //2 parametros, a qué se le aplicará el hash y cuál será su configuración

          //Registrar nuevo usuario
          const nuevoUsuario = new Usuario(input);//Crea una nueva instancia de Usuario con el input que reciba

          nuevoUsuario.save(); //Lo guarda en la base de datos
          return "Usuario creado correctamente"; //Porque el retorno del Schema del Mutation es un String, y se debe especificar

        } catch(error) {
          console.log(error);
        }
      },
      autenticarUsuario: async (_, {input}) => {
        const {email, password} = input;

        const existeUsuario = await Usuario.findOne({email});
        //Si el usuario existe
        if(!existeUsuario) {
          throw new Error('El usuario no existe');
        }
        //Si el password es correcto
        const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password); //Compora el password del input(parametro 1) y el password de la base de datos(parametro 2)
        
        if(!passwordCorrecto) {
          throw new Error('Password incorrecto');
        }

        //Dar acceso
        return {
          token: crearToken(existeUsuario, process.env.SECRETA, '8hr') //3 parametros, el usuario, la palabra secreta para firmar el token y el tiempo de expiración del mismo
        }
      },
      nuevoProyecto: async (_, {input}, ctx) => {
        try {

          const proyecto = new Proyecto(input);

          //Asociar el creador
          proyecto.creador = ctx.usuario.id;

          //Almacenar en la base de datos
          const resultado = await proyecto.save();

          return resultado;

        } catch(error) {
          console.log(error);
        }
      },
      actualizarProyecto: async(_, {id, input}, ctx) => {
        //Revisar si el proyecto existe o no
        let proyecto = await Proyecto.findById(id);

        if(!proyecto) {
          throw new Error('Proyecto no encontrado');
        }
        
        //Revisar que si la persona es el creador
        if(proyecto.creador.toString() !== ctx.usuario.id) {
          throw new Error('No tienes las credenciales para editar este proyecto');
        }

        //Guardar el proyecto
        proyecto = await Proyecto.findOneAndUpdate({_id: id}, input, {new: true}); //{_id: } que va a buscar para actualizar, : id es el valor que tiene que ser igual
        return proyecto;
      },
      eliminarProyecto: async(_, {id}, ctx) => {
          //Revisar si el proyecto existe o no
          let proyecto = await Proyecto.findById(id);
  
          if(!proyecto) {
            throw new Error('Proyecto no encontrado');
          }
  
          //Revisar que si la persona es el creador
          if(proyecto.creador.toString() !== ctx.usuario.id) {
            throw new Error('No tienes las credenciales para editar este proyecto');
          }
  
          //Eliminar
          await Proyecto.findOneAndDelete({_id: id});//{_id: } que va a buscar para borrar, : id es el valor que tiene que ser igua
      
          return "Proyecto eliminado";
      },
      nuevaTarea: async(_, {input}, ctx) => {
        try {
          
          const tarea = new Tarea(input);
          tarea.creador = ctx.usuario.id;
          
          //console.log(ctx);
          const resultado = await tarea.save();

          return resultado;

        } catch(error) {
          console.log(error);
        }
      },
      actualizarTarea: async(_, {id, input, estado}, ctx) => {
        //Si la tarea existe o no
        let tarea = await Tarea.findById(id);
        //console.log(tarea);
        if(!tarea) {
          throw new Error('Tarea no encontrada');
        }

        //Si la persona que edita es el creador
        /*if(tarea.creador.toString() !== ctx.id) {
          throw new Error('No tienes las credenciales para editar');
        }*/

        //Asingnar estado
        input.estado = estado;

        //Guardar y retornar la tarea
        tarea = await Tarea.findOneAndUpdate({_id: id}, input, {new: true}); //new: true es pedir que retorne los datos actualizados

        return tarea;

      },
      eliminarTarea: async(_, {id}, ctx) => {
         //Si la tarea existe o no
         let tarea = await Tarea.findById(id);
         //console.log('Este es el context', ctx);
         if(!tarea) {
           throw new Error('Tarea no encontrada');
         }
         
        //Si la persona que edita es el creador
        if(tarea.creador.toString() !== ctx.usuario.id) {
          throw new Error('No tienes las credenciales para editar');
        }

        //Eliminar
        await Tarea.findOneAndDelete({_id: id});

        return 'Tarea eliminada';
      }
    }
};

module.exports = resolvers;