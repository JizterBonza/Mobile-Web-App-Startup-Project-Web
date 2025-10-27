# Agrify Connect Web - Laravel 11 with MySQL

A Laravel 11 application configured to work with MySQL database.

## Project Setup Complete ✅

Your Laravel 11 project has been successfully set up with the following configuration:

- **Laravel Version**: 11.46.1
- **Database**: MySQL (configured)
- **PHP Extensions**: MySQL extensions are installed and ready
- **Environment**: Configured for local development

## Current Status

✅ Laravel 11 project created  
✅ MySQL database configuration set  
✅ Environment variables configured  
✅ Dependencies installed  
✅ Development server ready  

## Next Steps - MySQL Installation

### Option 1: Install MySQL Server

1. **Download MySQL Server**:
   - Visit [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
   - Download MySQL Community Server for Windows
   - Run the installer and follow the setup wizard

2. **Create Database**:
   ```sql
   CREATE DATABASE agrify_connect;
   ```

3. **Update .env file** (if needed):
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=agrify_connect
   DB_USERNAME=root
   DB_PASSWORD=your_mysql_password
   ```

### Option 2: Use XAMPP/WAMP

1. **Install XAMPP**:
   - Download from [XAMPP](https://www.apachefriends.org/download.html)
   - Install and start MySQL service
   - Access phpMyAdmin at `http://localhost/phpmyadmin`
   - Create database `agrify_connect`

### Option 3: Use Docker

1. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   services:
     mysql:
       image: mysql:8.0
       environment:
         MYSQL_ROOT_PASSWORD: password
         MYSQL_DATABASE: agrify_connect
       ports:
         - "3306:3306"
   ```

2. **Run with Docker**:
   ```bash
   docker-compose up -d
   ```

## Running the Application

1. **Start the development server**:
   ```bash
   php artisan serve
   ```

2. **Run database migrations** (after MySQL is set up):
   ```bash
   php artisan migrate
   ```

3. **Access the application**:
   - Open your browser and go to `http://localhost:8000`

## Project Structure

```
agrify-connect-web/
├── app/                 # Application logic
├── config/              # Configuration files
├── database/            # Database migrations and seeders
├── public/              # Web-accessible files
├── resources/           # Views, assets, and language files
├── routes/              # Route definitions
├── storage/             # File storage
├── tests/               # Test files
├── .env                 # Environment configuration
├── artisan              # Laravel command-line tool
└── composer.json        # PHP dependencies
```

## Development Commands

- `php artisan serve` - Start development server
- `php artisan migrate` - Run database migrations
- `php artisan make:model ModelName` - Create a new model
- `php artisan make:controller ControllerName` - Create a new controller
- `php artisan make:migration create_table_name` - Create a new migration
- `composer install` - Install PHP dependencies
- `npm install` - Install Node.js dependencies (if using frontend assets)

## Database Configuration

The application is configured to use MySQL with the following settings:

- **Host**: 127.0.0.1
- **Port**: 3306
- **Database**: agrify_connect
- **Username**: root
- **Password**: (set your MySQL root password)

## Troubleshooting

1. **MySQL Connection Issues**:
   - Ensure MySQL server is running
   - Check database credentials in `.env` file
   - Verify MySQL service is accessible on port 3306

2. **Permission Issues**:
   - Ensure `storage/` and `bootstrap/cache/` directories are writable
   - Run: `php artisan storage:link` if needed

3. **Composer Issues**:
   - Run `composer install` to install dependencies
   - Check PHP version compatibility (Laravel 11 requires PHP 8.2+)

## Support

For Laravel documentation, visit: [Laravel Documentation](https://laravel.com/docs)

---

**Project Status**: Ready for development with MySQL setup pending