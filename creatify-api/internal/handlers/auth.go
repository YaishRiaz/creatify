package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Register(c *gin.Context) {
	// TODO: implement user registration
	c.JSON(http.StatusNotImplemented, gin.H{"message": "register — coming soon"})
}

func Login(c *gin.Context) {
	// TODO: implement user login
	c.JSON(http.StatusNotImplemented, gin.H{"message": "login — coming soon"})
}
