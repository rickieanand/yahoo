import React, { useEffect, useState } from 'react'
import queryString from 'query-string'
import io from 'socket.io-client'
import {Layout, List, Button, Input } from 'antd'
import Sketch from "react-p5";
 
const { Header, Footer, Sider, Content } = Layout

let socket

const setup = (p5, canvasParentRef) => {
    p5.createCanvas(500, 500).parent(canvasParentRef)
    p5.background(0)
    
	socket.on('mouse', data => {
        p5.fill(0,0,255);
        p5.noStroke();
        p5.ellipse(data.x, data.y, 20, 20);
    })
}

const mouseDragged = (p5) => {
    //console.log('p5', p5)
	p5.fill(255);
	p5.noStroke();
	p5.ellipse(p5.mouseX, p5.mouseY, 20 ,20)
	sendmouse(p5.mouseX, p5.mouseY)
}

// Function for sending to the socket
const sendmouse = (xpos, ypos) => {
	// We are sending!
	console.log("sendmouse: " + xpos + " " + ypos);
	
	// Make a little object with  and y
	var data = {
		x: xpos,
		y: ypos
	};

	// Send that object to the socket
  	socket.emit('mouse',data);
}

const ENDPOINT = 'https://yahoo-chatroom.herokuapp.com:5000/'
const Chat = ({location}) => {
    const [name, setName] = useState('')
    const [room, setRoom] = useState('')
    const [users, setUsers] = useState('');
    const [message, setMessage] = useState()
    const [messages, setMessages] = useState([])
    const [view, setView] = useState('canvas')
    
    useEffect(()=>{
        const {name, room} = queryString.parse(location.search)
        
        socket = io(ENDPOINT)
        
        setRoom(room)
        setName(name)
        console.log('before Joined')

        socket.emit('join', {name, room}, (error)=>{
            alert('Joined', error)
        })

        return () => {
            socket.emit('disconnect')
            socket.off()
        }
    }, [ENDPOINT, location.search])
    
    useEffect(() => {
        socket.on('message', message => {
          setMessages([ ...messages, message ]);
        });
        
        socket.on("roomData", ({ users }) => {
          setUsers(users);
        });
    }, [messages]);
    
    const sendMessage = (event) => {
        console.log('sendMessage')
        event.preventDefault();

        if(message) {
            socket.emit('sendMessage', message, () => setMessage(''));
        }
    }
    const chatroomHandler = () => {
        setView('chatroom')
    }

    const blackboardHandler = () => {
        setView('blackboard')
    }
    return (
        <Layout>
            <Header>
                <span style={{border: '1px solid white', color: '#ccc', padding: '24px'}} className='view' onClick={chatroomHandler}>Chatroom</span>
                <span style={{border: '1px solid white', color: '#ccc', padding: '24px'}} className='view' onClick={blackboardHandler}>Black board</span>
            </Header>
            <Layout>
                <Content>

                    {
                        view === 'chatroom'
                        ?
                            <List
                                style={{height: '500px', overflowX: 'scroll'}}
                                size="large"
                                header={<div>Header</div>}
                                footer={<div>Footer</div>}
                                bordered
                                dataSource={messages}
                                renderItem={item => <List.Item>{`${item.user}: ${item.text}`}</List.Item>}
                            />
                        :
                            <Sketch setup={setup} mouseDragged={mouseDragged}/>
                    }
                </Content>
                <Sider>
                    <List
                        style={{height: '500px', overflowX: 'scroll'}}
                        size="large"
                        bordered
                        dataSource={users}
                        renderItem={item => <List.Item>{`${item.name}`}</List.Item>}
                    />
                </Sider>
            </Layout>
            <Footer>
                <>
                <Input
                    style={{width: '100%', padding: '24px'}}
                    type='text'
                    onChange={(event)=>setMessage(event.target.value)}
                    placeholder='Type your message'
                    onKeyPress={(event)=>event.key==='Enter' ? sendMessage(event) : null}
                    value={message}
                />
                <Button onClick={(event)=>sendMessage(event)}>Send</Button>
                </>
            </Footer>
        </Layout>
    )
}
export default Chat