#!/bin/bash

# Test runner script for local development
# This script runs all tests and generates coverage reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Adil Messenger Test Suite Runner${NC}"
echo "=================================="

# Function to run a test command and handle results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local required="$3"

    echo -e "\n${BLUE}📋 Running $test_name...${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        if [ "$required" = "true" ]; then
            echo -e "${RED}💥 Required test failed. Stopping execution.${NC}"
            exit 1
        fi
        return 1
    fi
}

# Function to check if dependencies are installed
check_dependencies() {
    echo -e "${BLUE}🔍 Checking dependencies...${NC}"
    
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi

    if ! command -v yarn >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Yarn not found, using npm...${NC}"
        NPM_CMD="npm run"
    else
        NPM_CMD="yarn"
    fi

    echo -e "${GREEN}✅ Dependencies checked${NC}"
}

# Function to install node modules if needed
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        if command -v yarn >/dev/null 2>&1; then
            yarn install
        else
            npm install
        fi
    fi
}

# Parse command line arguments
RUN_LINT=true
RUN_UNIT=true
RUN_INTEGRATION=false
RUN_E2E=false
RUN_COVERAGE=true
WATCH_MODE=false
BAIL_ON_FAILURE=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-lint)
            RUN_LINT=false
            shift
            ;;
        --no-unit)
            RUN_UNIT=false
            shift
            ;;
        --integration)
            RUN_INTEGRATION=true
            shift
            ;;
        --e2e)
            RUN_E2E=true
            shift
            ;;
        --no-coverage)
            RUN_COVERAGE=false
            shift
            ;;
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --no-bail)
            BAIL_ON_FAILURE=false
            shift
            ;;
        --all)
            RUN_INTEGRATION=true
            RUN_E2E=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --no-lint        Skip linting"
            echo "  --no-unit        Skip unit tests"
            echo "  --integration    Run integration tests"
            echo "  --e2e           Run end-to-end tests"
            echo "  --no-coverage   Skip coverage reporting"
            echo "  --watch         Run tests in watch mode"
            echo "  --no-bail       Continue on test failures"
            echo "  --all           Run all tests including integration and e2e"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
main() {
    check_dependencies
    install_dependencies

    local failed_tests=0

    # Linting
    if [ "$RUN_LINT" = true ]; then
        if ! run_test "Linting" "$NPM_CMD lint" "$BAIL_ON_FAILURE"; then
            ((failed_tests++))
        fi
    fi

    # Unit tests
    if [ "$RUN_UNIT" = true ]; then
        local unit_cmd="$NPM_CMD test:unit"
        if [ "$RUN_COVERAGE" = true ] && [ "$WATCH_MODE" = false ]; then
            unit_cmd="$unit_cmd --coverage"
        fi
        if [ "$WATCH_MODE" = true ]; then
            unit_cmd="$unit_cmd --watch"
        else
            unit_cmd="$unit_cmd --watchAll=false"
        fi

        if ! run_test "Unit Tests" "$unit_cmd" "$BAIL_ON_FAILURE"; then
            ((failed_tests++))
        fi
    fi

    # Integration tests
    if [ "$RUN_INTEGRATION" = true ]; then
        echo -e "${YELLOW}⚠️  Integration tests require a running PostgreSQL database${NC}"
        
        local integration_cmd="$NPM_CMD test:integration"
        if [ "$RUN_COVERAGE" = true ] && [ "$WATCH_MODE" = false ]; then
            integration_cmd="$integration_cmd --coverage"
        fi
        if [ "$WATCH_MODE" = false ]; then
            integration_cmd="$integration_cmd --watchAll=false"
        fi

        if ! run_test "Integration Tests" "$integration_cmd" "$BAIL_ON_FAILURE"; then
            ((failed_tests++))
        fi
    fi

    # End-to-end tests
    if [ "$RUN_E2E" = true ]; then
        echo -e "${YELLOW}⚠️  E2E tests require a running PostgreSQL database${NC}"
        
        local e2e_cmd="$NPM_CMD test:e2e"
        if [ "$RUN_COVERAGE" = true ] && [ "$WATCH_MODE" = false ]; then
            e2e_cmd="$e2e_cmd --coverage"
        fi
        if [ "$WATCH_MODE" = false ]; then
            e2e_cmd="$e2e_cmd --watchAll=false"
        fi

        if ! run_test "End-to-End Tests" "$e2e_cmd" "$BAIL_ON_FAILURE"; then
            ((failed_tests++))
        fi
    fi

    # Summary
    echo -e "\n${BLUE}📊 Test Summary${NC}"
    echo "==============="
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        
        if [ "$RUN_COVERAGE" = true ] && [ -d "coverage" ]; then
            echo -e "\n${BLUE}📈 Coverage Report${NC}"
            echo "Generated at: ./coverage/lcov-report/index.html"
            
            # Try to open coverage report if on macOS or Linux with desktop environment
            if command -v open >/dev/null 2>&1; then
                echo "Opening coverage report..."
                open ./coverage/lcov-report/index.html
            elif command -v xdg-open >/dev/null 2>&1; then
                echo "Opening coverage report..."
                xdg-open ./coverage/lcov-report/index.html
            fi
        fi
        
        exit 0
    else
        echo -e "${RED}❌ $failed_tests test suite(s) failed${NC}"
        exit 1
    fi
}

# Run main function
main