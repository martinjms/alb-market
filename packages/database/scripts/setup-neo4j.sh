#!/bin/bash

# Neo4j Database Setup Script for ALB Market
# This script sets up Neo4j for local development

set -e

echo "🚀 Setting up Neo4j for ALB Market local development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NEO4J_VERSION="5.22.0"
NEO4J_HOME="$HOME/.neo4j"
NEO4J_DATA="$NEO4J_HOME/data"
NEO4J_LOGS="$NEO4J_HOME/logs"
NEO4J_CONF="$NEO4J_HOME/conf"

# Default credentials
DEFAULT_USER="neo4j"
DEFAULT_PASSWORD="albmarket123"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on supported OS
check_os() {
    print_status "Checking operating system..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_success "macOS detected"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        print_success "Windows detected"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Check if Java is installed
check_java() {
    print_status "Checking Java installation..."
    
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
        print_success "Java found: $JAVA_VERSION"
        
        # Check if Java 11 or later
        JAVA_MAJOR=$(echo $JAVA_VERSION | cut -d'.' -f1)
        if [[ $JAVA_MAJOR -ge 11 ]] || [[ $JAVA_VERSION == 11* ]]; then
            print_success "Java version is compatible"
        else
            print_error "Neo4j requires Java 11 or later. Found: $JAVA_VERSION"
            print_status "Please install Java 11+ before continuing"
            exit 1
        fi
    else
        print_error "Java not found"
        print_status "Installing Java..."
        install_java
    fi
}

# Install Java based on OS
install_java() {
    case $OS in
        "linux")
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y openjdk-11-jdk
            elif command -v yum &> /dev/null; then
                sudo yum install -y java-11-openjdk-devel
            else
                print_error "Cannot install Java automatically. Please install Java 11+ manually."
                exit 1
            fi
            ;;
        "macos")
            if command -v brew &> /dev/null; then
                brew install openjdk@11
            else
                print_error "Homebrew not found. Please install Java 11+ manually."
                exit 1
            fi
            ;;
        "windows")
            print_error "Please install Java 11+ manually on Windows"
            exit 1
            ;;
    esac
}

# Download and install Neo4j
install_neo4j() {
    print_status "Installing Neo4j Community Edition v$NEO4J_VERSION..."
    
    # Create Neo4j directory
    mkdir -p "$NEO4J_HOME"
    cd "$NEO4J_HOME"
    
    # Download Neo4j
    NEO4J_PACKAGE="neo4j-community-$NEO4J_VERSION"
    NEO4J_URL="https://dist.neo4j.org/neo4j-community-$NEO4J_VERSION-unix.tar.gz"
    
    if [[ ! -d "$NEO4J_PACKAGE" ]]; then
        print_status "Downloading Neo4j from $NEO4J_URL"
        curl -L -o "$NEO4J_PACKAGE.tar.gz" "$NEO4J_URL"
        
        print_status "Extracting Neo4j..."
        tar -xzf "$NEO4J_PACKAGE.tar.gz"
        rm "$NEO4J_PACKAGE.tar.gz"
        
        # Create symlink for easier access
        ln -sf "$NEO4J_PACKAGE" neo4j-current
        
        print_success "Neo4j installed successfully"
    else
        print_warning "Neo4j already installed"
    fi
}

# Configure Neo4j
configure_neo4j() {
    print_status "Configuring Neo4j..."
    
    NEO4J_CURRENT="$NEO4J_HOME/neo4j-current"
    CONF_FILE="$NEO4J_CURRENT/conf/neo4j.conf"
    
    # Backup original config
    if [[ ! -f "$CONF_FILE.backup" ]]; then
        cp "$CONF_FILE" "$CONF_FILE.backup"
    fi
    
    # Configure Neo4j for development
    cat >> "$CONF_FILE" << EOF

# ALB Market Development Configuration
# Added by setup-neo4j.sh

# Database location
#server.databases.default_to_read_only=false
#server.database.mode=SINGLE

# Network configuration for local development
server.default_listen_address=0.0.0.0
server.bolt.listen_address=:7687
server.http.listen_address=:7474
server.https.listen_address=:7473

# Memory settings for development
server.memory.heap.initial_size=512m
server.memory.heap.max_size=1G
server.memory.pagecache.size=256m

# Security settings for development
dbms.security.auth_enabled=true
dbms.security.procedures.unrestricted=apoc.*,algo.*

# Logging
dbms.logs.http.enabled=true
dbms.logs.http.rotation.keep_number=3
dbms.logs.http.rotation.size=20M

# Performance
dbms.transaction.timeout=60s
dbms.lock.acquisition.timeout=60s

# APOC procedures (if needed)
dbms.security.procedures.whitelist=apoc.*
EOF
    
    print_success "Neo4j configuration updated"
}

# Set initial password
set_initial_password() {
    print_status "Setting initial password..."
    
    NEO4J_CURRENT="$NEO4J_HOME/neo4j-current"
    
    # Set the initial password
    "$NEO4J_CURRENT/bin/neo4j-admin" dbms set-initial-password "$DEFAULT_PASSWORD" || {
        print_warning "Password already set or Neo4j already initialized"
    }
    
    print_success "Initial password configured"
}

# Create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    ENV_FILE="$(pwd)/../../../.env.local"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        cat > "$ENV_FILE" << EOF
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=$DEFAULT_USER
NEO4J_PASSWORD=$DEFAULT_PASSWORD

# Neo4j Browser
NEO4J_BROWSER_URL=http://localhost:7474

EOF
        print_success "Environment file created: $ENV_FILE"
    else
        print_warning "Environment file already exists: $ENV_FILE"
        print_status "Make sure to update Neo4j settings if needed:"
        print_status "NEO4J_URI=bolt://localhost:7687"
        print_status "NEO4J_USER=$DEFAULT_USER"
        print_status "NEO4J_PASSWORD=$DEFAULT_PASSWORD"
    fi
}

# Create service scripts
create_service_scripts() {
    print_status "Creating service management scripts..."
    
    SCRIPT_DIR="$(pwd)"
    NEO4J_CURRENT="$NEO4J_HOME/neo4j-current"
    
    # Start script
    cat > "$SCRIPT_DIR/start-neo4j.sh" << EOF
#!/bin/bash
echo "🚀 Starting Neo4j..."
$NEO4J_CURRENT/bin/neo4j start
echo "📊 Neo4j Browser: http://localhost:7474"
echo "🔌 Bolt: bolt://localhost:7687"
echo "👤 User: $DEFAULT_USER"
echo "🔑 Password: $DEFAULT_PASSWORD"
EOF
    
    # Stop script
    cat > "$SCRIPT_DIR/stop-neo4j.sh" << EOF
#!/bin/bash
echo "⏹️  Stopping Neo4j..."
$NEO4J_CURRENT/bin/neo4j stop
EOF
    
    # Status script
    cat > "$SCRIPT_DIR/status-neo4j.sh" << EOF
#!/bin/bash
$NEO4J_CURRENT/bin/neo4j status
EOF
    
    # Make scripts executable
    chmod +x "$SCRIPT_DIR/start-neo4j.sh"
    chmod +x "$SCRIPT_DIR/stop-neo4j.sh"
    chmod +x "$SCRIPT_DIR/status-neo4j.sh"
    
    print_success "Service management scripts created"
}

# Test connection
test_connection() {
    print_status "Testing Neo4j connection..."
    
    # Start Neo4j if not running
    "$NEO4J_HOME/neo4j-current/bin/neo4j" start || true
    
    # Wait for Neo4j to start
    print_status "Waiting for Neo4j to start..."
    sleep 10
    
    # Test connection using cypher-shell
    if command -v "$NEO4J_HOME/neo4j-current/bin/cypher-shell" &> /dev/null; then
        echo "RETURN 'Connection successful' as status;" | "$NEO4J_HOME/neo4j-current/bin/cypher-shell" -u "$DEFAULT_USER" -p "$DEFAULT_PASSWORD" &> /dev/null
        if [[ $? -eq 0 ]]; then
            print_success "Neo4j connection test passed"
        else
            print_warning "Neo4j connection test failed. Check credentials and try manually."
        fi
    fi
}

# Main installation flow
main() {
    echo "=============================================="
    echo "    ALB Market Neo4j Setup Script"
    echo "=============================================="
    
    check_os
    check_java
    install_neo4j
    configure_neo4j
    set_initial_password
    create_env_file
    create_service_scripts
    test_connection
    
    echo ""
    echo "=============================================="
    print_success "Neo4j setup completed!"
    echo "=============================================="
    echo ""
    echo "📋 Next steps:"
    echo "1. Start Neo4j: ./scripts/start-neo4j.sh"
    echo "2. Access Neo4j Browser: http://localhost:7474"
    echo "3. Login with: $DEFAULT_USER / $DEFAULT_PASSWORD"
    echo "4. Run schema initialization: pnpm db:init-schema"
    echo ""
    echo "🔧 Management commands:"
    echo "• Start:  ./scripts/start-neo4j.sh"
    echo "• Stop:   ./scripts/stop-neo4j.sh"
    echo "• Status: ./scripts/status-neo4j.sh"
    echo ""
    echo "🔗 Connection details:"
    echo "• URI: bolt://localhost:7687"
    echo "• User: $DEFAULT_USER"
    echo "• Password: $DEFAULT_PASSWORD"
    echo "• Browser: http://localhost:7474"
    echo ""
}

# Run main function
main "$@"