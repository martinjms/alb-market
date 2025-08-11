#!/bin/bash

# Generic Claude Subprocess Spawner
# Single source of truth for all programmatic Claude sessions in hooks
# Ensures consistent behavior and prevents hook configuration mistakes

set -e

PROJECT_DIR="/home/martinjms/code/alb-market"
CLAUDE_BIN="/home/martijnms/.local/bin/claude"

usage() {
    echo "Generic Claude Subprocess Spawner"
    echo ""
    echo "Usage:"
    echo "  ./spawn-claude.sh <prompt> [options]"
    echo ""
    echo "Options:"
    echo "  --agent <name>           Use specific agent prompt"
    echo "  --session-log <message>  Log to session file with message"  
    echo "  --task-id <id>           Set task ID for tracking"
    echo "  --background             Run in background (default)"
    echo "  --synchronous            Wait for completion"
    echo "  --hooks <config>         Custom hooks (default: no hooks)"
    echo "  --timeout <seconds>      Set timeout (default: no timeout)"
    echo ""
    echo "Built-in Agents:"
    echo "  documentation    - Documentation Specialist"
    echo "  security         - Security Specialist" 
    echo "  testing          - Testing QA Specialist"
    echo "  backend          - Backend API Specialist"
    echo "  frontend         - Frontend React Specialist"
    echo ""
    echo "Examples:"
    echo "  ./spawn-claude.sh 'Fix the bug in app.js' --agent backend"
    echo "  ./spawn-claude.sh 'Update docs' --agent documentation --session-log 'Auto-doc triggered'"
}

# Built-in agent prompts
get_agent_prompt() {
    local agent="$1"
    local user_prompt="$2"
    
    case "$agent" in
        documentation)
            echo "You are the Documentation Specialist agent for ALB Market. $user_prompt

Focus on:
- README files for feature changes
- API documentation for backend changes  
- Component documentation for frontend changes
- Database schema documentation for data model changes
- Changelog for significant features

WORKFLOW:
1. Use Read tool to examine the code changes
2. Use Edit/Write tools to update documentation files
3. Use Bash tool: 'git add [only the docs you modified]'
4. Use Bash tool: 'git commit -m \"docs: [specific description of what docs were updated]\"'

Be concise and focus on user-facing changes, not implementation details.
You run without hooks, so your commits won't trigger more automation."
            ;;
        security)
            echo "You are the Security Specialist agent. $user_prompt

Focus on:
- Security vulnerabilities and fixes
- Authentication and authorization
- Input validation and sanitization
- OWASP compliance
- Secure coding practices"
            ;;
        testing)
            echo "You are the Testing QA Specialist agent for ALB Market (Neo4j + Node.js + React). $user_prompt

Focus on:
- Unit tests for components and functions
- Integration tests for Neo4j database operations
- API endpoint testing with proper test data
- React component testing with testing-library
- E2E tests for critical user flows
- GitHub Actions CI/CD test integration
- Test coverage analysis and improvements
- Mock data generation for Albion Online items

WORKFLOW:
1. Use Read tool to examine the code changes
2. Use Write tool to create test files (.test.js, .spec.js, etc.)
3. Generate realistic Albion Online test data and mocks
4. Use Bash tool: 'git add [only the test files you created]'
5. Use Bash tool: 'git commit -m \"test: [specific description of tests added]\"'

Create tests that can be automated in GitHub Actions. Use the project's existing test framework patterns.
You run without hooks, so your commits won't trigger more automation."
            ;;
        backend)
            echo "You are the Backend API Specialist agent. $user_prompt

Focus on:
- RESTful API design and implementation
- Database operations and optimization
- Authentication and middleware
- Error handling and logging
- Performance optimization"
            ;;
        frontend)
            echo "You are the Frontend React Specialist agent. $user_prompt

Focus on:
- React component development
- State management and hooks
- Responsive UI implementation
- API integration
- User experience optimization"
            ;;
        *)
            echo "$user_prompt"
            ;;
    esac
}

# Session logging function
log_to_session() {
    local message="$1"
    local task_id="$2"
    local session_file="$PROJECT_DIR/docs/sessions/2025-08-10-master-initial-setup.md"
    
    if [ -n "$message" ]; then
        echo "
### 🤖 Subprocess: $(date '+%Y-%m-%d %H:%M:%S')
**Task ID:** ${task_id:-"AUTO-$(date +%s)"}  
**Message:** $message  
**Status:** 🔄 Started
" >> "$session_file"
    fi
}

# Completion logging (called by subprocess)
log_completion() {
    local task_id="$1" 
    local duration="$2"
    local session_file="$PROJECT_DIR/docs/sessions/2025-08-10-master-initial-setup.md"
    
    echo "**Status:** ✅ Completed  
**Duration:** ${duration}s  
**Completed:** $(date '+%Y-%m-%d %H:%M:%S')
---
" >> "$session_file"
}

# Main subprocess spawning function
spawn_claude() {
    local prompt="$1"
    local agent=""
    local session_log=""
    local task_id=""
    local background="true"
    local hooks_config="{}"
    local timeout=""
    
    # Parse arguments
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --agent)
                agent="$2"
                shift 2
                ;;
            --session-log)
                session_log="$2"
                shift 2
                ;;
            --task-id)
                task_id="$2"
                shift 2
                ;;
            --background)
                background="true"
                shift
                ;;
            --synchronous)
                background="false"
                shift
                ;;
            --hooks)
                hooks_config="$2"
                shift 2
                ;;
            --timeout)
                timeout="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1" >&2
                exit 1
                ;;
        esac
    done
    
    # Generate task ID if not provided
    if [ -z "$task_id" ]; then
        task_id="SUBPROCESS-$(date +%s)-$$"
    fi
    
    # Get full agent prompt
    local full_prompt
    full_prompt=$(get_agent_prompt "$agent" "$prompt")
    
    # Log session start
    if [ -n "$session_log" ]; then
        log_to_session "$session_log" "$task_id"
    fi
    
    # Create temporary hooks config
    local temp_settings="/tmp/claude-subprocess-$task_id.json"
    echo "$hooks_config" > "$temp_settings"
    
    # Build Claude command
    local claude_cmd="'$CLAUDE_BIN' --settings '$temp_settings' --permission-mode bypassPermissions -p"
    
    # Add timeout if specified
    if [ -n "$timeout" ]; then
        claude_cmd="timeout $timeout $claude_cmd"
    fi
    
    # Subprocess execution
    if [ "$background" = "true" ]; then
        # Background execution
        nohup bash -c "
            start_time=\$(date +%s)
            
            echo '$full_prompt' | $claude_cmd > /dev/null 2>&1
            exit_code=\$?
            
            end_time=\$(date +%s)
            duration=\$((end_time - start_time))
            
            # Log completion if session logging enabled
            if [ -n '$session_log' ]; then
                $0 --log-completion '$task_id' \$duration
            fi
            
            # Cleanup
            rm -f '$temp_settings'
            
            exit \$exit_code
        " > /dev/null 2>&1 &
        
        echo "🚀 Subprocess started (Task ID: $task_id, PID: $!)"
    else
        # Synchronous execution
        start_time=$(date +%s)
        
        echo "$full_prompt" | eval "$claude_cmd"
        exit_code=$?
        
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        
        # Log completion
        if [ -n "$session_log" ]; then
            log_completion "$task_id" "$duration"
        fi
        
        # Cleanup
        rm -f "$temp_settings"
        
        echo "✅ Subprocess completed (Duration: ${duration}s)"
        exit $exit_code
    fi
}

# Handle internal completion logging
if [ "$1" = "--log-completion" ]; then
    log_completion "$2" "$3"
    exit 0
fi

# Main execution
if [ $# -eq 0 ]; then
    usage
    exit 1
fi

spawn_claude "$@"