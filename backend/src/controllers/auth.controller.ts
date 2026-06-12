import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-development-key';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, usuario.passwordhash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: usuario.id, rol: usuario.rol, nombre: usuario.nombre, empleadoId: usuario.empleadoid },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        email: usuario.email,
        empleadoId: usuario.empleadoid,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error en el servidor', error });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    // El middleware ya validó el token y puso la data en req.user
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    
    // Obtener los datos más frescos
    const dbUser = await prisma.usuarios.findUnique({
      where: { id: user.userId },
      select: { id: true, nombre: true, rol: true, email: true, empleadoid: true }
    });
    
    if (!dbUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({
      id: dbUser.id,
      nombre: dbUser.nombre,
      rol: dbUser.rol,
      email: dbUser.email,
      empleadoId: dbUser.empleadoid,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error });
  }
};
