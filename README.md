# Academic Department Automation Platform

A project I built with a friend to solve the scheduling nightmare in our university department. 
What started as "let's just automate exam scheduling" turned into a full platform that could 
probably run the whole department if needed.

## The Problem

Ever tried manually assigning 200+ exam observers across 50+ time slots while making sure nobody has conflicts? It's a disaster. People were spending hours on this every semester, and there were always mistakes.

So I built this system that does it automatically using three different optimization algorithms. Turns out, scheduling is actually a pretty complex problem.

## What It Does

- **Automatically assigns exam observers** based on availability, preferences, and constraints
- **Schedules exams** without conflicts (mostly - see known issues below)
- **Manages users and permissions** - admins, observers, the whole thing
- **Compares different algorithms** to see which works best for different scenarios
- **Handles bulk uploads** - you can dump a CSV or an Excel file and it figures everything out

## The Tech Stack

**Frontend:** React 19
**Backend:** Node.js + Express 
**Database:** PostgreSQL 
**Algorithms:** Three different approaches because I wasn't sure which would work best

## The Algorithms

I implemented three different approaches and honestly, they all have their strengths:

- **Genetic Algorithm** - Tries to "evolve" better solutions over generations. Sounds fancy but it's basically trial and error with some intelligence.
- **Linear Programming** - Uses mathematical optimization (thanks to GLPK.js). This one is surprisingly fast when it works.
- **Greedy Algorithm** - The simple one that just picks the best option at each step. Surprisingly effective for most cases.

You can run all three and compare results. The genetic algorithm usually finds the best solutions but takes forever on large datasets.

## Setup

Fair warning: the setup is a bit involved because this was my first full-stack project.

1. Clone this repo
2. Install PostgreSQL (I used version 14, anything 12+ should work)
3. Create a database called `academic_automation` (or whatever you want, just update the config)
4. Run the database setup:
   ```bash
   cd backend
   node database/initDB.js
   ```
5. Install dependencies in both folders:
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend  
   cd ../frontend && npm install
   ```
6. Create a `.env` file in the backend folder with your database credentials
7. Start both servers:
   ```bash
   # Backend (from backend folder)
   npm start
   
   # Frontend (from frontend folder)
   npm start
   ```

## Usage

The UI is pretty straightforward:
1. Upload your exam schedule (CSV format)
2. Add observers and their availability
3. Hit "Run Optimization" and pick your algorithm
4. Review the results and export if you're happy

There's also a comparison dashboard where you can run all algorithms side-by-side and see which one performs best.

## Known Issues

- The genetic algorithm sometimes takes forever on large datasets (500+ exams)
- The UI gets a bit laggy when dealing with 1000+ records
- GLPK.js setup can be tricky on Windows - you might need to install some additional dependencies
- There are probably bugs I haven't found yet
- the algorithim comparison page still needs some ironing 

## What I Learned

This project taught me a lot:
- Scheduling problems are way more complex than they seem
- Genetic algorithms are cool but not always practical
- React state management can get messy really fast
- A greedy algorithim with huristics is surprisingly powerful for optimization problems

## Future Improvements

Things I'd like to add if I ever get back to this:
- Better error handling (there's definitely room for improvement)
- More algorithm options
- Better mobile responsiveness
- Performance optimizations for large datasets

## Contributing

Feel free to submit issues or pull requests. The code is probably not the cleanest since this was a learning project, but it works.

## License

MIT License - use it however you want.

---

Built this because I was tired of manually scheduling exams. Hope it's useful to someone else dealing with the same problem.
