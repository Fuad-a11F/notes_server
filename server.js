let Sequelize = require('sequelize')
let express = require('express')
const cors = require('cors')
let app = express()
const bcrypts = require('bcryptjs')
var jwt = require('jsonwebtoken');

app.use(express.json())
app.use(cors())

let sequelize = new Sequelize('toDo', 'root', 'root', {
    dialect: 'mysql',
    define: {timestamps: false}
})

const User = sequelize.define('user', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  }
})

const Main = sequelize.define('main', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      }
})

const Task = sequelize.define('task', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      }
})

const Task_list  = sequelize.define('task_list', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      edit: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      }
})

User.hasMany(Main, {onDelete: "cascade"})
Main.hasMany(Task, { onDelete: "cascade" })
Task.hasMany(Task_list, { onDelete: "cascade" })
   
app.post('/get_all', (req, res) => {
  let decoded = jwt.decode(req.body.token, {complete: true});
  Main.findAll({raw:true, where: {userId: decoded.payload.id}}).then(data => res.json(data))
})

function get_task(id) {
  return Task.findAll({where:{mainId: id}, raw: true})
}

app.get('/get_tasks', async (req, res) => {
  let task = await get_task(req.query._id)
  let tasks_list = []
  task.forEach((item, index) => {
    Task_list.findAll({where:{taskId: item.id}, raw: true}).then(data => {tasks_list.push(...data)})
    .then(() =>  {
      if (index === task.length - 1) {
        res.json({task: task, tasks_list: tasks_list})
      }
    })
  })
})

app.delete('/delete_title', (req, res) => {
  let index = req.query._id
  Main.destroy({where: {id: index}}).then((res) => {
    console.log(res);
  });
})

app.delete('/delete_task', (req, res) => {
  let index = req.query._id
  Task.destroy({where: {id: index}}).then((res) => {
    console.log(res);
  });
})

app.delete('/delete_task_list', (req, res) => {
  let index = req.query._id
  Task_list.destroy({where: {id: index}}).then((res) => {
    console.log(res);
  });
})

app.post('/create_main', (req, res) => {
  let decoded = jwt.decode(req.body.token, {complete: true});
  Main.create({title: req.body.value, userId: decoded.payload.id}).then(data=> res.json(data))
})

app.post('/create_task', (req, res) => {
  Task.create({title: req.body.value, mainId: req.body.index}).then(data => res.json(data))
})

app.post('/create_task_list', (req, res) => {
  Task_list.create({title: req.body.value, taskId: req.body.id, completed: false, edit: false})
  .then(data => res.json(data))
})

app.post('/task_list_completed', (req, res) => {
  Task_list.findByPk(req.body.id).then(data => {
    Task_list.update({completed: !data.completed}, {where: {id: req.body.id}})
  })
  res.send('ok')
})

app.post('/edit_task_list', (req, res) => {
  Task_list.update({title: req.body.editText}, {where: {id: req.body.id}})
  res.send('ok')
})

app.post('/auth', (req, res) => {
  User.findOne({where: {email: req.body.email}}).then(answer => {
    if (!answer) {
      let hashPassword = bcrypts.hashSync(req.body.password, 7)
      User.create({email: req.body.email, name: req.body.name, password: hashPassword})
      res.json("Все ок")
    }
    else {
      return res.status(400).json("Ошибка")
    }
  })
})

app.post('/login', (req, res) => {
  User.findOne({where: {email: req.body.email}}).then(answer => {
    if (bcrypts.compareSync(req.body.password, answer.password)) {
      let token = jwt.sign({id: answer.id}, 'SECRET_KEY_NOTES', {expiresIn: '1h'})
      res.json({token})
    }
    else {
      res.json("Ошибка")
    }
  }).catch((dd) => {
    res.json("Ошибка")
  })
})

app.put('/sorted', (req, res) => {
  console.log(req.body);
  Task_list.update({taskId: req.body.board.id}, {where: {id: req.body.item.id}})
})

app.put('/sorted_one', (req, res) => {
  Task_list.update({title: req.body.obj.title, completed: req.body.obj.completed, edit: req.body.obj.edit}, {where: {id: req.body.item.id}})
  Task_list.update({title: req.body.item.title, completed: req.body.item.completed, edit: req.body.item.edit},  {where: {id: req.body.obj.id}})
})


let port = process.env.PORT || 5000

sequelize.sync().then(result => {
    app.listen(port, () => {
        console.log('Server has been started')
    })
}).catch(err=> console.log(err))